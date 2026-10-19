import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import moment from 'moment';
import sequelize from '../config/database.js';
import { initAssociations, Hostel, Role, User, SpecialFoodItem, FoodOrder, StudentFee, Session, Enrollment, MessBill, RoomType, HostelRoom, RoomAllotment } from '../models/index.js';
import { ensureAdditionalFoodSchema, migrateAdditionalFoodClassification } from '../services/additionalFoodSchema.js';
import { createSpecialFoodItem, updateSpecialFoodItem, updateSpecialFoodAvailability, createFoodOrder, updateFoodOrderStatus, updatePaymentStatus, cancelFoodOrder } from '../controllers/messController.js';
import { recordStaffRecordedSpecialFoodConsumption } from '../controllers/specialMealController.js';
import { buildMonthlyMessReport } from '../services/monthlyMessReport.js';
import { getAdditionalFoodStudentReport } from '../controllers/additionalFoodReportController.js';
import { studentMessCharges } from '../services/studentMessCharges.js';

initAssociations();
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const originalTransaction = sequelize.transaction.bind(sequelize);
const originalQuery = sequelize.query.bind(sequelize);
let outer;
try {
  await ensureAdditionalFoodSchema();
  outer = await originalTransaction();
  sequelize.query = (sql, options = {}) => originalQuery(sql, { ...options, transaction: options.transaction || outer });
  sequelize.transaction = (options, callback) => typeof options === 'function'
    ? originalTransaction({ transaction: outer }, async inner => { const name = inner.name; try { return await options(inner); } finally { inner.name = name; } })
    : originalTransaction({ ...options, transaction: options?.transaction || outer }, callback);
  const tag = randomUUID();
  const hostel = await Hostel.create({ name: `Additional food test ${tag}`, capacity: 1 });
  const role = await Role.findOne({ where: { roleName: 'Student' } }) || await Role.create({ roleName: 'Student' });
  const user = await User.create({ userName: 'Additional food test', userMail: `${tag}@invalid.test`, password: 'test-only', roleId: role.roleId, hostel_id: hostel.id, status: true });
  const date = moment().utcOffset(330).add(1, 'day').format('YYYY-MM-DD');
  const period = moment(date);
  const session = await Session.create({ name: `Food billing ${tag}`, start_date: period.clone().startOf('month').toDate(), end_date: period.clone().endOf('month').toDate() });
  await Enrollment.create({ student_id: user.userId, hostel_id: hostel.id, session_id: session.id, college: 'nec' });
  const actor = { userId: user.userId, hostel_id: hostel.id, role: 'student' };
  const supervisor = { ...actor, role: 'mess' };
  const payload = { name: `Weekly egg ${tag}`, category: 'Non-Veg', meal_type: 'Lunch', price: 12.50, max_quantity_per_student: 2, weekly_day: moment(date).day(), order_deadline_time: '16:00', is_available: true };
  const invoke = async (handler, req, expected = 200) => { const res = response(); await handler(req, res); assert.equal(res.statusCode, expected, JSON.stringify(res.body)); return res.body.data; };
  const food = await invoke(createSpecialFoodItem, { body: payload }, 201);
  assert.equal(food.order_deadline_time, '16:00');
  assert.equal(food.category, 'Non-Veg');
  assert.equal(food.meal_type, 'Lunch');
  const legacy = await SpecialFoodItem.create({ ...payload, name: `Legacy dinner ${tag}`, category: 'Dinner', meal_type: null });
  await migrateAdditionalFoodClassification(outer);
  await legacy.reload();
  assert.equal(legacy.meal_type, 'Dinner');
  assert.equal(legacy.category, 'Unspecified');
  await migrateAdditionalFoodClassification(outer);
  await food.reload();
  assert.equal(food.category, 'Non-Veg');
  await invoke(updateSpecialFoodItem, { params: { id: food.id }, body: { ...payload, price: 15 } });
  await invoke(updateSpecialFoodItem, { params: { id: food.id }, body: { ...payload, order_deadline_time: '19:01' } }, 400);
  await invoke(updateSpecialFoodAvailability, { params: { id: food.id }, body: { is_available: false } });
  const request = { user: actor, body: { serving_date: date, items: [{ food_item_id: food.id, quantity: 2 }] } };
  await invoke(createFoodOrder, request, 400);
  await invoke(updateSpecialFoodAvailability, { params: { id: food.id }, body: { is_available: true } });
  const order = await invoke(createFoodOrder, request, 201);
  assert.equal(Number(order.total_amount), 30);
  await invoke(createFoodOrder, request, 400);
  assert.equal(await FoodOrder.count({ where: { student_id: user.userId } }), 1, 'repeated orders cannot bypass the cumulative maximum');
  assert.equal(order.FoodOrderItems.length, 1);
  assert.equal(moment(order.requested_time).utcOffset(330).format('HH:mm'), '13:00');
  assert.equal(moment(order.requested_time).utcOffset(330).format('YYYY-MM-DD'), date);
  const fee = () => StudentFee.findOne({ where: { food_order_id: order.id } });
  assert.equal(Number((await fee()).amount), 30, 'student selection adds an additional fee immediately');
  let report = await buildMonthlyMessReport(hostel.id, period.month() + 1, period.year(), undefined, outer);
  assert.equal(report.data[0].specialFoodAmount, 30);
  assert.equal(report.data[0].additionalAmount, 30);
  assert.equal(report.calculation.deductions.specialOrders.amount, 30, 'charge is excluded from common food expenses in the serving month');
  const charges = await studentMessCharges(actor, period.month() + 1, period.year());
  assert.equal(charges.monthlySummary.totalMonthlySpecialFoodCost, 30);
  assert.equal(charges.dailyCharges.find(row => row.date === date).specialFoodCost, 30);
  const roomType = await RoomType.create({ name: `Food rooms ${tag}`, capacity: 1, hostel_id: hostel.id });
  const room10 = await HostelRoom.create({ hostel_id: hostel.id, room_type_id: roomType.id, room_number: '10' });
  const room2 = await HostelRoom.create({ hostel_id: hostel.id, room_type_id: roomType.id, room_number: '2' });
  await RoomAllotment.create({ student_id: user.userId, room_id: room10.id, allotment_date: period.clone().startOf('month').toDate() });
  await Enrollment.update({ roll_number: `R-${tag.slice(0, 8)}` }, { where: { student_id: user.userId, hostel_id: hostel.id } });
  const vegFood = await SpecialFoodItem.create({ ...payload, name: `Vegetable ${tag}`, category: 'Veg' });
  for (let i = 0; i < 2; i++) {
    const otherUser = await User.create({ userName: `Food student ${i}`, roll_number: `AF-${tag.slice(0,8)}-${i}`, userMail: `${tag}-${i}@invalid.test`, password: 'test-only', roleId: role.roleId, hostel_id: hostel.id, status: true });
    await RoomAllotment.create({ student_id: otherUser.userId, room_id: i === 0 ? room2.id : room10.id, allotment_date: period.clone().startOf('month').toDate() });
    await invoke(createFoodOrder, { user: { ...actor, userId: otherUser.userId }, body: { serving_date: date, items: [{ food_item_id: vegFood.id, quantity: 1 }] } }, 201);
  }
  const foodReportRequest = { user: supervisor, query: { date, meal_type: 'Lunch', include_staff: 'false' } };
  let foodReport = await invoke(getAdditionalFoodStudentReport, foodReportRequest);
  assert.deepEqual(foodReport.veg.map(row => row.room_number), ['2', '10'], 'room sorting is numeric');
  assert.equal(foodReport.nonVeg[0].quantity, 2);
  assert.equal(foodReport.nonVeg[0].roll_number, `R-${tag.slice(0,8)}`, 'roll number falls back to enrollment');
  assert.equal(foodReport.nonVeg[0].name, user.userName);
  // Reports retain the recorded dietary category and name if the master changes.
  await SpecialFoodItem.update({ category: 'Veg', name: `Renamed ${tag}` }, { where: { id: food.id } });
  foodReport = await invoke(getAdditionalFoodStudentReport, foodReportRequest);
  assert.equal(foodReport.nonVeg[0].food, payload.name);
  await SpecialFoodItem.update({ category: 'Non-Veg', name: payload.name }, { where: { id: food.id } });
  for (let i = 0; i < 2; i++) await invoke(updateFoodOrderStatus, { user: supervisor, params: { id: order.id }, body: { status: 'confirmed' } });
  assert.equal(await StudentFee.count({ where: { food_order_id: order.id } }), 1, 'approval cannot bill twice');
  await invoke(updatePaymentStatus, { user: supervisor, params: { id: order.id }, body: { payment_status: 'paid' } });
  assert.equal(Number((await fee()).amount), 0, 'separate payment cannot also enter the monthly additional bill');
  await invoke(updatePaymentStatus, { user: supervisor, params: { id: order.id }, body: { payment_status: 'pending' } });
  assert.equal(Number((await fee()).amount), 30);
  await invoke(cancelFoodOrder, { user: supervisor, params: { id: order.id }, body: {} });
  assert.equal(Number((await fee()).amount), 0, 'cancelled food leaves no payable additional charge');
  report = await buildMonthlyMessReport(hostel.id, period.month() + 1, period.year(), undefined, outer);
  assert.equal(report.data[0].additionalAmount, 0);
  foodReport = await invoke(getAdditionalFoodStudentReport, foodReportRequest);
  assert.equal(foodReport.nonVeg.length, 0, 'cancelled selections disappear from the report');
  // A midnight deadline is already closed today, but authorized staff can
  // still record actual leftover food with their notes and a distinct fee.
  await SpecialFoodItem.update({ order_deadline_time: '00:00' }, { where: { id: food.id } });
  const today = moment().utcOffset(330).format('YYYY-MM-DD');
  const closedFood = await SpecialFoodItem.create({ ...payload, name: `Closed today ${tag}`, weekly_day: moment(today).day(), order_deadline_time: '00:00' });
  await invoke(createFoodOrder, { user: actor, body: { serving_date: today, items: [{ food_item_id: closedFood.id, quantity: 1 }] } }, 400);
  const recorded = await invoke(recordStaffRecordedSpecialFoodConsumption, { user: supervisor, body: {
    student_ids: [user.userId], consumption_date: today, items: [{ food_item_id: food.id, quantity: 1 }], description: 'One extra egg served from leftovers; noted by supervisor.',
  } }, 201);
  assert.equal(recorded.studentCount, 1);
  assert.equal(recorded.amountPerStudent, 15);
  assert.match(recorded.foodOrders[0].notes, /leftovers/);
  assert.match(recorded.studentFees[0].description, /leftovers/);
  assert.equal(recorded.studentFees[0].food_order_id, recorded.foodOrders[0].id);
  assert.equal(await StudentFee.count({ where: { food_order_id: recorded.foodOrders[0].id } }), 1);
  const staffPeriod = moment(today);
  const staffReport = await buildMonthlyMessReport(hostel.id, staffPeriod.month() + 1, staffPeriod.year(), undefined, outer);
  assert.equal(staffReport.data[0].specialFoodAmount, 15);
  const studentOnly = await invoke(getAdditionalFoodStudentReport, { user: supervisor, query: { date: today, include_staff: 'false' } });
  assert.equal(studentOnly.nonVeg.length, 0, 'supervisor extras are excluded by default');
  const withExtras = await invoke(getAdditionalFoodStudentReport, { user: supervisor, query: { date: today, include_staff: 'true' } });
  assert.equal(withExtras.nonVeg[0].quantity, 1);
  const wrongHostel = await invoke(getAdditionalFoodStudentReport, { user: { ...supervisor, hostel_id: hostel.id + 1000000 }, query: { date } });
  assert.equal(wrongHostel.total_students, 0, 'reports are hostel-scoped');
  await MessBill.create({ student_id: user.userId, hostel_id: hostel.id, month: period.month() + 1, year: period.year(), amount: 30, due_date: date });
  await invoke(createFoodOrder, request, 409);
  await invoke(updatePaymentStatus, { user: supervisor, params: { id: order.id }, body: { payment_status: 'pending' } }, 409);
  console.log('PASS: deadline cap and late rejection; student additional bill; one fee per order; cancellations/payments; monthly and daily billing; supervisor extra consumption after cutoff with notes; finalized-month protection.');
} finally {
  sequelize.transaction = originalTransaction;
  sequelize.query = originalQuery;
  if (outer && !outer.finished) await outer.rollback();
  await sequelize.close();
}
