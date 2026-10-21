import { Op } from 'sequelize';
import { sequelize, User, Attendance, GPSAttendance, DayReductionRequest, Enrollment, Session, RoomAllotment, HostelRoom } from '../models/index.js';
import { billingMonth } from '../services/billingDays.js';
import { dateOnly, reductionDates, errorWithStatus } from '../utils/reductionRules.js';
import { getHistoricalBilling } from '../utils/historicalBilling.js';

export async function getAttendanceRoster(req, res) {
  try {
    const hostel_id = Number(req.user.hostel_id ?? req.user.hostelId);
    if (!hostel_id) throw errorWithStatus('Select a hostel.');
    const enrollments = await Enrollment.findAll({ where:{hostel_id,status:'active'}, include:[
      {model:User,as:'Student',required:true,where:{hostel_id,status:true},attributes:['userId','userName','roll_number'],include:[
        {model:RoomAllotment,as:'tbl_RoomAllotments',where:{is_active:true},required:false,attributes:['id','room_id'],include:[
          {model:HostelRoom,where:{hostel_id},required:true,attributes:['room_number']}
        ]}
      ]},
      {model:Session,attributes:['name'],required:false}
    ] });
    const people = new Map();
    for (const row of enrollments) {
      const activeRoom = [...(row.Student.tbl_RoomAllotments || [])].sort((a,b)=>b.id-a.id)[0]?.HostelRoom;
      people.set(row.student_id,{id:row.student_id,userId:row.student_id,userName:row.Student.userName,
        username:row.Student.userName,roll_number:row.Student.roll_number,college:row.college,session:row.Session?.name,hostel_id,
        room_number:activeRoom?.room_number ?? null});
    }
    res.json({success:true,data:[...people.values()].sort((a,b)=>a.userName.localeCompare(b.userName))});
  } catch(error) {res.status(error.status||500).json({message:error.message});}
}

async function saveEntries(user, entries, transaction) {
  const hostelId = Number(user.hostel_id ?? user.hostelId);
  if (!hostelId) throw errorWithStatus('Select a hostel.');
  // Stable lock ordering also serializes manual entry with reduction approval.
  const ids = [...new Set(entries.map(e => Number(e.student_id)))].sort((a, b) => a - b);
  for (const id of ids) {
    const student = await User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!student || Number(student.hostel_id) !== hostelId) throw errorWithStatus('Student does not belong to this hostel.', 403);
  }
  const saved = [];
  for (const entry of entries) {
    if (!['P', 'A', 'OD'].includes(entry.status)) throw errorWithStatus('Attendance must be P, A, or OD.');
    const dates = entry.from_date || entry.to_date ? reductionDates(entry.from_date, entry.to_date) : [dateOnly(entry.date)];
    for (const date of dates) {
      if (await getHistoricalBilling(hostelId, Number(date.slice(5, 7)), Number(date.slice(0, 4)))) throw errorWithStatus('This historical attendance period is protected.', 409);
      const rows = await Attendance.findAll({ where: { student_id: Number(entry.student_id), hostel_id: hostelId, date,
        [Op.or]: [{ is_monthly: false }, { is_monthly: null }] }, transaction });
      if (rows.some(row => row.reduction_request_id)) throw errorWithStatus('Attendance is linked to an approved reduction. Cancel or correct that request first.', 409);
      const values = { student_id: Number(entry.student_id), hostel_id: hostelId, date, status: entry.status,
        marked_by: user.userId, remarks: String(entry.remarks || '').slice(0, 2000),
        reason: ['NCC', 'NSS', 'Internship', 'Other'].includes(entry.reason) ? entry.reason : null,
        from_date: dates.length > 1 ? dates[0] : null, to_date: dates.length > 1 ? dates.at(-1) : null,
        is_monthly: false, totalManDays: entry.status === 'A' ? 0 : 1 };
      if (rows.length) for (const row of rows) saved.push(await row.update(values, { transaction }));
      else saved.push(await Attendance.create(values, { transaction }));
    }
  }
  return saved;
}
export async function markAttendance(req, res) {
  try {
    const records = await sequelize.transaction(transaction => saveEntries(req.user, [req.body], transaction));
    res.json({ success: true, data: records[0], message: 'Attendance saved. This does not grant a mess reduction.' });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
}
export async function updateAttendance(req, res) {
  try {
    const existing = await Attendance.findByPk(req.params.id);
    if (!existing || Number(existing.hostel_id) !== Number(req.user.hostel_id ?? req.user.hostelId)) throw errorWithStatus('Attendance not found.', 404);
    if (existing.is_monthly) throw errorWithStatus('Legacy monthly summaries cannot be edited as daily attendance.', 409);
    const records = await sequelize.transaction(transaction => saveEntries(req.user, [{ ...req.body, student_id: existing.student_id, date: existing.date }], transaction));
    res.json({ success: true, data: records[0], message: 'Attendance updated; approved reductions are unchanged.' });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
}
export async function bulkMarkAttendance(req, res) {
  try {
    if (!Array.isArray(req.body.attendanceData) || !req.body.attendanceData.length || req.body.attendanceData.length > 1000) throw errorWithStatus('Submit between 1 and 1000 attendance entries.');
    await sequelize.transaction(transaction => saveEntries(req.user, req.body.attendanceData.map(row => ({ ...row, date: req.body.date })), transaction));
    res.json({ success: true, message: 'Attendance saved. No financial reduction was granted.' });
  } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
}

export async function getAttendance(req, res) {
  try {
    const hostel_id = Number(req.user.hostel_id ?? req.user.hostelId);
    if (!hostel_id) throw errorWithStatus('Select a hostel.');
    const monthly = req.query.view === 'monthly' || (req.query.month && req.query.year);
    const period = monthly ? billingMonth(req.query.month, req.query.year) : null;
    const date = monthly ? { [Op.between]: [period.start, period.end] } : dateOnly(req.query.date);
    const includes = [
      { model: User, as: 'Student', attributes: ['userId', 'userName', 'roll_number'] },
      { model: User, as: 'MarkedBy', attributes: ['userId', 'userName'] },
      { model: DayReductionRequest, as: 'ReductionRequest', attributes: ['id', 'category', 'activity', 'status'] }
    ];
    const legacyMonthlySummaries = monthly ? await Attendance.findAll({where:{hostel_id,date,is_monthly:true},include:[includes[0]],order:[['student_id','ASC']]}) : [];
    if (req.query.is_monthly === 'true' || req.query.is_monthly === true) return res.json({success:true,data:legacyMonthlySummaries,legacy:true});
    const [manual, gps] = await Promise.all([
      Attendance.findAll({ where: { hostel_id, date, [Op.or]: [{ is_monthly: false }, { is_monthly: null }] }, include: includes, order: [['date', 'DESC'], ['id', 'DESC']] }),
      GPSAttendance.findAll({ where: { hostel_id, attendance_date: date }, include: [{ model: User, attributes: ['userId', 'userName', 'roll_number'] }], order:[['marked_at','DESC']] })
    ]);
    const byDay = new Map();
    for (const row of manual) {
      const key = `${row.student_id}:${row.date}`;
      if (!byDay.has(key) || row.reduction_request_id) byDay.set(key, row.get({plain:true}));
    }
    for (const row of gps) {
      const key = `${row.user_id}:${row.attendance_date}`;
      if (!byDay.has(key)) byDay.set(key, {id:`gps-${row.id}`,student_id:row.user_id,date:row.attendance_date,status:row.status,source:'GPS',Student:row.User});
    }
    res.json({success:true,data:[...byDay.values()],legacyMonthlySummaries,view:monthly?'monthly':'daily'});
  } catch (error) { res.status(error.status || 500).json({message:error.message}); }
}
