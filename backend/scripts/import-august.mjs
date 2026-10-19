import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { User, Role, Enrollment, Attendance, StudentFee, MessBill, MessDailyExpense, ExpenseType, IncomeType, AdditionalIncome, DailyRateLog, Session } from '../models/index.js';
import { HistoricalBilling } from '../utils/historicalBilling.js';

const dir = new URL('../import-work/august-2026/', import.meta.url);
const source = JSON.parse(fs.readFileSync(new URL('source.json', dir)));
const hostel_id = 2, month = 8, year = 2026;
const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const normalize = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
try {
  assert.equal(source.month, month); assert.equal(source.year, year);
  assert.equal(source.students.reduce((s,r)=>s+r.days,0), source.sourceTotals.days);
  assert.equal(source.students.reduce((s,r)=>s+r.final,0), source.sourceTotals.final);
  const role = await Role.findOne({ where: { roleName: 'Student' } });
  const actor = await User.findOne({ where: { userName: 'mess1', hostel_id } });
  const warden = await User.findOne({ where: { userName: 'warden_1', hostel_id } });
  assert(role && actor && warden, 'Expected staff and student role must exist');
  const session = await Session.findOne({ where: { name: '2026-2027' } });
  assert(session, 'Academic session must exist');
  const users = await User.findAll();
  const mapped = source.students.map(r => {
    const hits = users.filter(u => r.roll ? u.roll_number === r.roll : normalize(u.userName) === normalize(r.name));
    assert(hits.length <= 1, `Ambiguous identity at ${r.sheet}:${r.row}`);
    if (hits.length) {
      assert.equal(hits[0].hostel_id, hostel_id, `Hostel mismatch for ${r.name}`);
      assert.equal(hits[0].roleId, role.roleId, `Role mismatch for ${r.name}`);
    }
    assert(Math.abs((r.total || 0) - (r.mess+r.additional+r.bed+r.newspaper+r.guest+r.fine)) < .015, `Source line mismatch ${r.row}`);
    assert(Math.abs(r.mess-r.days*r.rate) < .015, `Source rate mismatch ${r.row}`);
    return { ...r, user: hits[0] };
  });
  const audit = { sourceHash: source.sha256, matched: mapped.filter(r=>r.user).length,
    newAccounts: mapped.filter(r=>!r.user).length, rows: mapped.length, days: source.sourceTotals.days,
    total: source.sourceTotals.final, blankRolls: mapped.filter(r=>!r.roll).map(r=>({name:r.name,row:r.row})),
    notes: ['Monthly totals only; no daily attendance invented.', 'Source row final amounts retained; blank final amounts on zero-charge rows treated as zero.',
      'MANDAYS F425 cached zero ignored; individual mess amounts independently reconciled.',
      'New accounts use reserved .invalid email addresses and unknown random passwords; no messages sent.',
      'Expenses and income booked on August 31 as explicitly labelled monthly summaries; stock movements not invented.',
      'No payment evidence supplied; imported bills remain pending.'] };
  fs.writeFileSync(new URL('preflight.json', dir), JSON.stringify(audit,null,2));
  console.log(JSON.stringify(audit));
  if (process.argv.includes('--apply')) {
    // Full, private before-image of every table this importer can modify.
    const models = [User,Enrollment,Attendance,StudentFee,MessBill,MessDailyExpense,ExpenseType,IncomeType,AdditionalIncome,DailyRateLog];
    const backup = {};
    for (const model of models) backup[model.getTableName()] = await model.findAll({raw:true});
    const backupPath = new URL(`backup-${Date.now()}.json`,dir);
    fs.writeFileSync(backupPath, JSON.stringify(backup,null,2), {flag:'wx'});
    const exists = await sequelize.getQueryInterface().showAllTables();
    if (exists.includes('tbl_HistoricalBilling')) {
      const prior = await HistoricalBilling.findOne({where:{hostel_id,month,year}});
      if (prior) {
        assert.equal(prior.source_hash, source.sha256, 'Different historical import already exists');
        console.log('Already imported; no changes.');
        await sequelize.close(); process.exit(0);
      }
    }
    const period = {[Op.between]:['2026-08-01','2026-08-31']};
    for (const [model,where] of [[Attendance,{hostel_id,date:period}], [StudentFee,{hostel_id,month,year}],
      [MessBill,{hostel_id,month,year}], [MessDailyExpense,{hostel_id,expense_date:period}],
      [AdditionalIncome,{hostel_id,received_date:{[Op.between]:['2026-08-01','2026-09-01']}}]]) {
      assert.equal(await model.count({where}),0,`Existing August ${model.name} records require reconciliation; import stopped`);
    }
    await HistoricalBilling.sync();
    const result = await sequelize.transaction(async transaction => {
      const opts = {transaction};
      const rows=[];
      for (const r of mapped) {
        const user = r.user || await User.create({userName:r.name,userMail:`aug2026-${r.college}-${r.row}@historical.invalid`,
          password:await bcrypt.hash(crypto.randomBytes(32).toString('hex'),10),roleId:role.roleId,
          roll_number:r.roll,hostel_id,status:true},opts);
        const enrolled=await Enrollment.findOne({where:{student_id:user.userId,hostel_id},...opts});
        if (!enrolled) await Enrollment.create({student_id:user.userId,hostel_id,session_id:session.id,
          roll_number:r.roll,college:r.college,requires_bed:r.bed>0,status:'active'},opts);
        await Attendance.create({student_id:user.userId,hostel_id,date:'2026-08-01',status:r.days>0?'P':'A',
          totalManDays:r.days,is_monthly:true,marked_by:warden.userId,
          remarks:`August 2026 monthly source summary: ${r.sheet} row ${r.row}; individual attendance dates unavailable.`},opts);
        for (const [fee_type,amount] of [['additional',r.additional],['bed_charge',r.bed],['newspaper',r.newspaper],['guest',r.guest],['fine',r.fine]]) {
          if(amount) await StudentFee.create({student_id:user.userId,hostel_id,month,year,fee_type,amount,
            description:`Historical August workbook ${r.sheet} row ${r.row}`,issued_by:actor.userId,issue_date:'2026-08-31',status:'pending'},opts);
        }
        await MessBill.create({student_id:user.userId,hostel_id,month,year,amount:r.final,status:'pending',due_date:'2026-09-07'},opts);
        const total=round(r.total||0);
        rows.push({studentId:user.userId,name:r.name,regNo:r.roll||'Not supplied',college:r.college,
          messDays:r.days,dailyRate:r.rate,messAmount:round(r.mess),additionalAmount:round(r.additional+r.guest+r.fine),
          bedCharges:r.bed,hinduIndianExpress:r.newspaper,total,netAmount:total,roundingUp:round(r.final-total),finalAmount:r.final,
          sourceSheet:r.sheet,sourceRow:r.row});
      }
      for(const e of source.expenses){
        const [type]=await ExpenseType.findOrCreate({where:{name:e.name},defaults:{description:'Historical monthly expense category'},...opts});
        await MessDailyExpense.create({hostel_id,expense_type_id:type.id,amount:round(e.amount),expense_date:'2026-08-31',
          description:'August 2026 monthly summary imported from DAILY RATE; not a dated purchase or stock transaction.',recorded_by:actor.userId},opts);
      }
      for(const e of source.deductions){
        if(!e.amount)continue;
        const [type]=await IncomeType.findOrCreate({where:{name:e.name},defaults:{description:'Historical monthly billing deduction'},...opts});
        await AdditionalIncome.create({hostel_id,income_type_id:type.id,amount:e.amount,received_date:'2026-08-31',
          description:'August 2026 monthly billing deduction from workbook; individual receipt dates unavailable.',received_by:actor.userId},opts);
      }
      const deductions={cashToken:{amount:source.deductions[0].amount},creditToken:{amount:source.deductions[1].amount},
        specialOrders:{amount:source.deductions[2].amount},guestIncome:{amount:source.deductions[3].amount}};
      const daily={expenses:source.expenses.map(e=>({...e,amount:round(e.amount)})),subTotal:round(source.sourceTotals.gross),
        deductions,totalDeductions:source.deductions.reduce((s,e)=>s+e.amount,0),totalExpenses:round(source.sourceTotals.net),
        totalManDays:source.sourceTotals.days,dailyRate:92.98,unroundedDailyRate:source.sourceTotals.rate};
      const summary={daysInMonth:31,operationalDays:null,holidayCount:null,dailyRate:92.98,messDays:daily.totalManDays,
        totalFoodIngredientCost:round(source.expenses[0].amount),totalOtherMessExpenses:round(daily.subTotal-source.expenses[0].amount),
        subTotal:daily.subTotal,totalExpenses:daily.totalExpenses,cashToken:deductions.cashToken.amount,
        creditToken:deductions.creditToken.amount,studentAdditionalCreditToken:deductions.specialOrders.amount,studentGuestIncome:0};
      const payload={rows,daily,summary,provenance:audit};
      await HistoricalBilling.create({hostel_id,month,year,source_hash:source.sha256,payload},opts);
      await DailyRateLog.create({hostel_id,month,year,gross_expenses:daily.subTotal,total_deductions:daily.totalDeductions,
        total_man_days:daily.totalManDays,daily_rate:daily.dailyRate,saved_by:actor.userId},opts);
      assert.equal(rows.reduce((s,r)=>s+r.finalAmount,0),1541146);
      return payload;
    });
    fs.writeFileSync(new URL('reconciliation.json',dir),JSON.stringify(result,null,2));
    console.log('COMMITTED: 537 bills; 13837 man-days; total INR 1541146. No emails sent.');
  }
} finally { await sequelize.close(); }
