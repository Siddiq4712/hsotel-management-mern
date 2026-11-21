import test from 'node:test';
import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import {Attendance,GPSAttendance,User,Hostel,Inventory,MessDailyExpense,AdditionalIncome,DailyConsumption,FoodOrder,MessBill,MessBillingSnapshot,DailyRateLog} from '../models/index.js';
import {InventoryBillingPolicy} from '../models/inventoryBilling.js';
import {historicalMonthlyRate} from '../services/historicalMonthlyRate.js';
import {getMessCalculation} from '../services/messCalculation.js';
import {buildMonthlyMessReport} from '../services/monthlyMessReport.js';
import {generateMessBills,saveDailyRate} from '../controllers/messController.js';
import {studentMessCharges} from '../services/studentMessCharges.js';

function fixtures(t) {
 const students=[{student_id:10,hostel_id:1,roll:'A',days:20},{student_id:20,hostel_id:2,roll:'B',days:15},{student_id:30,hostel_id:156,roll:'C',days:0}];
 const archive={inventory_id:99,month:7,year:2026,total_man_days:35,gross_expenses:1100,total_deductions:100,
  payload:{students,expenses:[{name:'Rice & Grocery',amount:1000},{name:'Water',amount:100}],deductions:[{name:'Cash Token',amount:10},{name:'Sister Concern Bill',amount:20},{name:'Student Additional Credit Token',amount:70},{name:'Student Guest Income',amount:0}]}};
 const attendance=students.map(row=>({...row,totalManDays:row.days}));
 const expenses=archive.payload.expenses.map(r=>({amount:r.amount,ExpenseType:{name:r.name}}));
 t.mock.method(sequelize,'query',async()=>[[archive]]);
 t.mock.method(InventoryBillingPolicy,'findAll',async()=>[{inventory_id:99,mode:'shared',hostel_ids:[1,2],effective_from:'2026-07-01'}]);
 // LAPC's historical fallback is the same inventory, even though the old policy omitted it.
 t.mock.method(InventoryBillingPolicy,'findOne',async()=>({inventory_id:99,mode:'shared',hostel_ids:[1,2],effective_from:'2026-07-01'}));
 t.mock.method(Attendance,'findAll',async()=>attendance);
 t.mock.method(User,'findAll',async()=>students.map(r=>({userId:r.student_id,roll_number:r.roll})));
 t.mock.method(Hostel,'findAll',async()=>[{id:1,name:'Boys 1'},{id:2,name:'Boys 2'},{id:156,name:'LAPC'}]);
 t.mock.method(MessDailyExpense,'findAll',async()=>expenses);
 t.mock.method(AdditionalIncome,'findAll',async()=>archive.payload.deductions.map(r=>({amount:r.amount,IncomeType:{name:r.name}})));
 for(const model of [Attendance,GPSAttendance,DailyConsumption,FoodOrder,MessBill,MessBillingSnapshot]) t.mock.method(model,'count',async()=>0);
 return {archive,attendance,expenses};
}
test('monthly rate uses verified resident totals, includes water and has no invented daily dates',async t=>{
 fixtures(t);
 const calculation=await getMessCalculation(1,7,2026);
 assert.equal(calculation.totalManDays,35);assert.equal(calculation.billing.totalManDays,20);
 assert.equal(calculation.subTotal,1100);assert.equal(calculation.totalDeductions,100);
 assert.equal(calculation.dailyRate,1000/35);assert.equal(calculation.waterRate,0);
 assert.equal(calculation.waterIncluded,true);assert.equal(calculation.rateOnly,true);
 assert.deepEqual(calculation.coveredHostelIds,[1,2,156]);
 assert.equal(calculation.billing.byStudent.get('10').baseDays,null);
 assert.deepEqual(calculation.billing.byStudent.get('10').billableDates,[]);
 assert.equal(calculation.deductions.specialOrders.amount,70);
});
test('unresolved August days block recalculation rather than using a partial denominator',async t=>{
 const {archive}=fixtures(t);archive.payload.students.push({name:'Unresolved',days:7});
 await assert.rejects(historicalMonthlyRate(1,8,2026),/1 resident identities \(7 man-days\)/);
 assert.equal(Attendance.findAll.mock.callCount(),0);
});
test('swapped individual monthly totals cannot pass by preserving the group total',async t=>{
 const {attendance}=fixtures(t);attendance[0].totalManDays=15;attendance[1].totalManDays=20;
 await assert.rejects(historicalMonthlyRate(1,7,2026),/resident monthly total/);
});
test('offsetting expense changes cannot pass by preserving gross expense',async t=>{
 const {expenses}=fixtures(t);expenses[0].amount+=10;expenses[1].amount-=10;
 await assert.rejects(historicalMonthlyRate(1,7,2026),/expense category/);
});
test('missing monthly rows and duplicate resident rows fail closed',async t=>{
 const {attendance}=fixtures(t);attendance.pop();
 await assert.rejects(historicalMonthlyRate(1,7,2026),/source roster/);
 attendance.push({...attendance[0]});
 await assert.rejects(historicalMonthlyRate(1,7,2026),/identity is missing or duplicated/);
});
for(const [model,message] of [[GPSAttendance,/daily attendance overlaps/],[DailyConsumption,/source deduplication/],[FoodOrder,/source deduplication/],[MessBill,/finalized bills/],[MessBillingSnapshot,/finalized bills/]]) {
 test(`${model.name} conflicting evidence blocks a historical rate`,async t=>{
  fixtures(t);model.count.mock.mockImplementation(async()=>1);
  await assert.rejects(historicalMonthlyRate(1,7,2026),message);
 });
}
test('report-only monthly rate cannot generate student bills or save a billing rate',async t=>{
 fixtures(t);
 await assert.rejects(buildMonthlyMessReport(1,7,2026),/student charges and legacy identity/);
 t.mock.method(sequelize,'transaction',async cb=>cb({LOCK:{UPDATE:'UPDATE'}}));
 t.mock.method(Hostel,'findByPk',async()=>({id:1}));
 t.mock.method(DailyRateLog,'findOrCreate',async()=>{throw new Error('Must not write a rate');});
 const res={code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await saveDailyRate({user:{hostel_id:1,userId:1},body:{month:7,year:2026}},res);
 assert.equal(res.code,409);assert.match(res.body.message,/report-only/);
 assert.equal(DailyRateLog.findOrCreate.mock.callCount(),0);
});
test('bill generation rolls back a report-only shared month before any snapshots or bills are created', async t => {
 fixtures(t);
 const transaction = {LOCK:{UPDATE:'UPDATE'}, rollback: t.mock.fn(async () => {})};
 t.mock.method(sequelize, 'transaction', async () => transaction);
 t.mock.method(Inventory, 'findByPk', async () => ({id:99}));
 t.mock.method(MessBillingSnapshot, 'findAll', async () => []);
 const snapshot = t.mock.method(MessBillingSnapshot, 'create', async () => assert.fail('Unexpected snapshot write'));
 const bill = t.mock.method(MessBill, 'create', async () => assert.fail('Unexpected bill write'));
 const res = {code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
 await generateMessBills({user:{hostel_id:1,userId:1},body:{month:7,year:2026}},res);
 assert.equal(res.code,409);
 assert.match(res.body.message,/student charges and legacy identity/);
 assert.equal(transaction.rollback.mock.callCount(),1);
 assert.equal(snapshot.mock.callCount(),0);
 assert.equal(bill.mock.callCount(),0);
});
test('student charge detail refuses to reconstruct days from a report-only month', async t => {
 fixtures(t);
 t.mock.method(MessBill, 'findOne', async () => null);
 await assert.rejects(studentMessCharges({hostel_id:1,userId:10},7,2026), {
  status:409, message:/daily charge breakdown cannot be derived/
 });
 assert.equal(Attendance.findAll.mock.callCount(),1, 'only the monthly attendance roster was queried');
});
test('other periods and absent archives retain normal billing; unexpected DB errors are surfaced',async t=>{
 fixtures(t);
 assert.equal(await historicalMonthlyRate(1,10,2026),null);assert.equal(sequelize.query.mock.callCount(),0);
 sequelize.query.mock.mockImplementation(async()=>[[]]);
 assert.equal(await historicalMonthlyRate(1,7,2026),null);
 sequelize.query.mock.mockImplementation(async()=>{throw {original:{code:'ER_NO_SUCH_TABLE'}};});
 assert.equal(await historicalMonthlyRate(1,7,2026),null);
 sequelize.query.mock.mockImplementation(async()=>{throw new Error('Access denied');});
 await assert.rejects(historicalMonthlyRate(1,7,2026),/Access denied/);
});
