import moment from 'moment';
import { Op } from 'sequelize';
import { FoodOrder, FoodOrderItem, SpecialFoodItem, User, RoomAllotment, HostelRoom, Enrollment } from '../models/index.js';
import { buildAdditionalFoodReport } from '../utils/additionalFoodReport.js';

export async function getAdditionalFoodStudentReport(req, res) {
  const { date, meal_type = 'all', include_staff = 'false' } = req.query;
  const hostelId = Number(req.user.hostel_id);
  if (!Number.isInteger(hostelId) || hostelId < 1) return res.status(400).json({ success: false, message: 'Select a hostel for the report.' });
  if (typeof date !== 'string' || !moment(date, 'YYYY-MM-DD', true).isValid()) return res.status(400).json({ success: false, message: 'Select a valid serving date.' });
  if (!['all', 'Breakfast', 'Lunch', 'Dinner'].includes(meal_type) || !['true', 'false'].includes(include_staff)) return res.status(400).json({ success: false, message: 'Invalid report filter.' });
  try {
    const start = new Date(`${date}T00:00:00+05:30`), end = new Date(`${date}T23:59:59.999+05:30`);
    const orders = await FoodOrder.findAll({ where: { hostel_id: hostelId, status: { [Op.ne]: 'cancelled' },
      requested_time: { [Op.between]: [start, end] }, ...(include_staff === 'true' ? {} : { [Op.or]: [{ order_source: 'student' }, { order_source: null }] }) },
      include: [{ model: User, as: 'Student', attributes: ['userId', 'userName', 'roll_number'] }, { model: FoodOrderItem, include: [{ model: SpecialFoodItem }] }] });
    const students = [...new Set(orders.map(row => row.student_id))];
    const [rooms, enrollments] = students.length ? await Promise.all([
      RoomAllotment.findAll({ where: { student_id: { [Op.in]: students }, allotment_date: { [Op.lte]: end }, [Op.or]: [{ vacation_date: null }, { vacation_date: { [Op.gte]: start } }] },
        include: [{ model: HostelRoom, required: true, where: { hostel_id: hostelId }, attributes: ['room_number'] }], order: [['allotment_date', 'DESC'], ['id', 'DESC']] }),
      Enrollment.findAll({ where: { hostel_id: hostelId, student_id: { [Op.in]: students } }, attributes: ['student_id', 'roll_number'], order: [['enrollment_date', 'DESC']], raw: true }),
    ]) : [[], []];
    return res.json({ success: true, data: { ...buildAdditionalFoodReport(orders, rooms, enrollments, date, meal_type), include_staff: include_staff === 'true' } });
  } catch (error) {
    console.error('Additional food student report error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate the student food report.' });
  }
}
