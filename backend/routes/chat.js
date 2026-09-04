import express from 'express';
import { Op } from 'sequelize';
import { auth } from '../middleware/auth.js';
import {
  User, Role, Hostel, HostelRoom, RoomAllotment, Leave, Complaint, Attendance,
  Fee, StudentFee, Menu, MenuSchedule, ParentStudent, HostelNotice, FoodOrder, SpecialFoodItem, Outpass,
  Session, Item, ItemStock
} from '../models/index.js';

const router = express.Router();
router.use(auth);

const dateOnly = (date = new Date()) => date.toISOString().slice(0, 10);
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const roleOf = (user) => user.role === 'lapc' ? 'student' : user.role;
const CHAT_OPTIONS = {
  student: ['Apply outpass', 'Apply leave', 'My room', 'My fees', 'Raise complaint', 'Food order'],
  parent: ['Student details', 'Room details', 'Leave status', 'Fee status', 'Notices'],
  warden: ['Search student', 'Enroll student', 'Pending gate passes', 'Leave requests', 'Room allotment', 'Manage complaints'],
  admin: ['Admin dashboard', 'Manage hostels', 'Room management', 'Create user', 'Manage sessions', 'Outpass logs'],
  mess: ['Manage menus', 'Menu planner', 'Stock management', 'Daily meal entry', 'Food orders', 'Mess reports'],
  security: ['Gate pass summary', 'Students outside hostel', 'Search outpass'],
};

// The chat window displays these options both as initial quick actions and as
// follow-up suggestion chips. Quick actions navigate in the browser, whereas
// suggestion chips are sent to this endpoint. Keep the two experiences
// consistent by returning the destination for every supported role option.
const CHAT_NAVIGATION_OPTIONS = {
  student: [
    [/^(?:apply )?(?:outpass|gate ?pass)$/i, '/outpass', 'Opening the Outpass request form.'],
    [/^(?:apply )?leave$/i, '/apply-leave', 'Opening the Leave request form.'],
    [/^(?:my )?room$/i, '/view-rooms', 'Opening your room details.'],
    [/^(?:my )?fees?$/i, '/hfee', 'Opening your fee details.'],
    [/^(?:raise )?complaint$/i, '/submit-complaint', 'Opening the complaint form.'],
    [/^(?:food order|mess menu)$/i, '/food-order', 'Opening the food order page.'],
  ],
  warden: [
    [/^(?:search|find) student$/i, '/students', 'Opening student management.'],
    [/^enroll student$/i, '/enroll-student', 'Opening student enrollment.'],
    [/^(?:pending )?(?:gate ?passes|outpasses)$/i, '/outpass-approval', 'Opening outpass approvals.'],
    [/^leave requests$/i, '/leave-requests', 'Opening leave requests.'],
    [/^(?:room allotment|manage rooms)$/i, '/room-allotment', 'Opening room allotment.'],
    [/^(?:manage )?complaints$/i, '/complaints', 'Opening complaint management.'],
  ],
  admin: [
    [/^(?:admin )?dashboard$/i, '/dashboard', 'Opening the admin dashboard.'],
    [/^manage hostels$/i, '/hostels', 'Opening hostel management.'],
    [/^(?:room management|manage rooms)$/i, '/room-management', 'Opening room management.'],
    [/^create user$/i, '/create-user', 'Opening user creation.'],
    [/^(?:manage )?sessions$/i, '/sessions', 'Opening academic sessions.'],
    [/^outpass logs$/i, '/outpass-logs', 'Opening outpass logs.'],
  ],
  mess: [
    [/^manage menus$/i, '/menus', 'Opening menu management.'],
    [/^menu planner$/i, '/menu-planner', 'Opening the menu planner.'],
    [/^(?:stock|stock management)$/i, '/stock', 'Opening stock management.'],
    [/^(?:daily )?meal entry$/i, '/single-page-daily-entry', 'Opening daily meal entry.'],
    [/^food orders$/i, '/food-orders', 'Opening food orders.'],
    [/^(?:mess )?reports?$/i, '/consumption-report', 'Opening mess reports.'],
  ],
};

const getNavigationOption = (role, message) =>
  (CHAT_NAVIGATION_OPTIONS[role] || []).find(([pattern]) => pattern.test(message));

// Suggestions are selected from the authenticated role, never from user input.
const reply = (res, intent, text, suggestions = [], navigationPath = null) => res.json({
  intent,
  text,
  suggestions: CHAT_OPTIONS[res.locals.chatRole] || suggestions,
  navigationPath,
});

function detectIntent(message) {
  const text = message.toLowerCase();
  if (/food orders?|meal orders?|pending orders?/.test(text)) return 'FOOD_ORDERS';
  // Keep reports ahead of stock so phrases such as "stock report" open reports.
  if (/\b(?:mess\s+)?reports?\b|consumption report|daily rate report|daily expenses?/.test(text)) return 'MESS_REPORTS';
  if (/\b(?:stock|inventory)\b/.test(text)) return 'STOCK_MANAGEMENT';
  if (/feedback|food complaint|food quality|complain about/.test(text)) return 'MESS_FEEDBACK';
  if (/menu|breakfast|lunch|dinner|meal|food/.test(text)) return 'MESS_MENU';
  if (/roommate/.test(text)) return 'ROOMMATES';
  if (/room|staying|occupant|vacant|occupancy/.test(text)) return 'ROOM';
  if (/fee|dues?|paid|payment/.test(text)) return 'FEES';
  if (/leave|outpass|return/.test(text)) return 'LEAVE';
  if (/complaint|fan|water|electric|maintenance|feedback/.test(text)) return 'COMPLAINTS';
  if (/notice|announcement/.test(text)) return 'NOTICES';
  if (/attendance|absent/.test(text)) return 'ATTENDANCE';
  if (/student|find |search |\bstu\d+\b|summary/.test(text)) return 'STUDENTS';
  if (/stat|summary|how many|total/.test(text)) return 'SUMMARY';
  return 'UNKNOWN';
}

// Administrators can see every hostel. Warden and mess users are always kept
// inside their assigned hostel; a chat request must never widen that scope.
const staffScope = (role, hostelId) =>
  role === 'admin' || !hostelId ? {} : { hostel_id: hostelId };

const studentRoleFilter = {
  roleName: { [Op.in]: ['Student', 'student', 'LAPC', 'lapc'] }
};

async function studentListText(role, hostelId, query = '') {
  const where = { ...staffScope(role, hostelId) };
  if (query) {
    where[Op.or] = [
      { roll_number: { [Op.like]: `%${query}%` } },
      { userName: { [Op.like]: `%${query}%` } }
    ];
  }

  const students = await User.findAll({
    where,
    attributes: ['userId', 'userName', 'roll_number', 'hostel_id'],
    include: [{ model: Role, as: 'role', attributes: [], where: studentRoleFilter, required: true }],
    order: [['userName', 'ASC']],
    limit: 10
  });
  const title = query ? `Student results for “${query}”` : 'Student list';
  if (!students.length) return `👥 **${title}**\nNo students were found.`;
  return `👥 **${title}**${students.length === 10 ? ' (first 10)' : ''}\n${students.map((student) => `• ${student.userName} — ${student.roll_number || `ID ${student.userId}`}`).join('\n')}\n\nAsk “find <name or roll number>” for a specific student.`;
}

async function foodOrdersText(hostelId) {
  if (!hostelId) return 'I need a hostel assignment before I can show food orders.';
  const orders = await FoodOrder.findAll({
    where: { hostel_id: hostelId, status: { [Op.in]: ['pending', 'confirmed', 'preparing', 'ready'] } },
    include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number'] }],
    order: [['requested_time', 'ASC']],
    limit: 10
  });
  if (!orders.length) return '🍽️ **Food Orders**\nThere are no active food orders.';
  return `🍽️ **Active Food Orders**\n${orders.map((order) => `• #${order.id} ${order.Student?.userName || 'Student'} — ${order.status}`).join('\n')}`;
}

async function availableFoodText() {
  const foods = await SpecialFoodItem.findAll({
    where: {
      is_available: true,
      [Op.or]: [{ expiry_time: null }, { expiry_time: { [Op.gt]: new Date() } }]
    },
    attributes: ['id', 'name', 'price', 'category'],
    order: [['category', 'ASC'], ['name', 'ASC']],
    limit: 12
  });
  if (!foods.length) return '🍽️ **Available Food Items**\nNo food items are available to order right now.';
  return `🍽️ **Available Food Items**\n${foods.map((food) => `• ${food.name} — ${money(food.price)}${food.category ? ` (${food.category})` : ''}`).join('\n')}\n\nPlease contact the mess staff if you need to place an order.`;
}

async function outpassText(studentId) {
  const outpasses = await Outpass.findAll({
    where: { student_id: studentId },
    order: [['from_date', 'DESC']],
    limit: 5
  });
  if (!outpasses.length) return '🚪 **My Outpass Status**\nYou do not have any outpass requests yet.';
  return `🚪 **My Outpass Status**\n${outpasses.map((outpass) => `• ${outpass.destination} — ${outpass.status.toUpperCase()} (${dateOnly(outpass.from_date)} to ${dateOnly(outpass.to_date)})`).join('\n')}`;
}

async function staffOutpassText(hostelId) {
  const outpasses = await Outpass.findAll({
    where: { ...(hostelId ? { hostel_id: hostelId } : {}), status: { [Op.in]: ['pending', 'approved', 'outside', 'late_return'] } },
    include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number'] }],
    order: [['from_date', 'ASC']],
    limit: 10
  });
  if (!outpasses.length) return '🚪 **Outpass Status**\nThere are no active or pending outpasses.';
  return `🚪 **Outpass Status**\n${outpasses.map((outpass) => `• ${outpass.Student?.userName || 'Student'} — ${outpass.destination} (${outpass.status})`).join('\n')}`;
}

async function pendingLeavesText(role, hostelId) {
  const leaves = await Leave.findAll({
    where: { status: 'pending' },
    include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number'], where: staffScope(role, hostelId), required: true }],
    order: [['from_date', 'ASC']],
    limit: 10
  });
  if (!leaves.length) return '📋 **Pending Leave Requests**\nThere are no pending leave requests.';
  return `📋 **Pending Leave Requests**\n${leaves.map((leave) => `• ${leave.Student?.userName || 'Student'} — ${dateOnly(leave.from_date)} to ${dateOnly(leave.to_date)}`).join('\n')}`;
}

async function stockText(hostelId) {
  if (!hostelId) return 'I need a hostel assignment before I can show stock.';
  const stock = await ItemStock.findAll({
    where: { hostel_id: hostelId }, include: [{ model: Item, attributes: ['name'] }], order: [['last_updated', 'DESC']], limit: 10
  });
  if (!stock.length) return '📦 **Current Stock**\nNo inventory records were found.';
  return `📦 **Current Stock**\n${stock.map((entry) => `• ${entry.Item?.name || 'Item'} — ${entry.current_stock}`).join('\n')}`;
}

async function hostelsText() {
  const hostels = await Hostel.findAll({ attributes: ['name', 'capacity', 'is_active'], order: [['name', 'ASC']], limit: 10 });
  if (!hostels.length) return '🏠 **Hostels**\nNo hostels were found.';
  return `🏠 **Hostels**\n${hostels.map((hostel) => `• ${hostel.name} — capacity ${hostel.capacity} (${hostel.is_active ? 'active' : 'inactive'})`).join('\n')}`;
}

async function sessionsText() {
  const sessions = await Session.findAll({ attributes: ['name', 'start_date', 'end_date', 'is_active'], order: [['start_date', 'DESC']], limit: 10 });
  if (!sessions.length) return '📅 **Sessions**\nNo sessions were found.';
  return `📅 **Sessions**\n${sessions.map((session) => `• ${session.name} — ${dateOnly(session.start_date)} to ${dateOnly(session.end_date)} (${session.is_active ? 'active' : 'inactive'})`).join('\n')}`;
}

async function linkedStudentIds(parentId) {
  const links = await ParentStudent.findAll({ where: { parent_id: parentId }, attributes: ['student_id'] });
  return links.map((link) => link.student_id);
}

async function studentRoom(studentId) {
  const allotment = await RoomAllotment.findOne({
    where: { student_id: studentId, is_active: true },
    include: [{ model: HostelRoom, include: [Hostel] }],
    order: [['allotment_date', 'DESC']]
  });
  return allotment?.HostelRoom || null;
}

async function roomText(studentId, includeRoommates = true) {
  const room = await studentRoom(studentId);
  if (!room) return "I couldn't find an active room allotment for this student.";
  let text = `🏠 **Room Details**\nHostel: ${room.Hostel?.name || '—'}\nRoom: ${room.room_number}\nFloor: ${room.floor ?? '—'}`;
  if (includeRoommates) {
    const allotments = await RoomAllotment.findAll({
      where: { room_id: room.id, is_active: true },
      include: [{ model: User, as: 'AllotmentStudent', attributes: ['userName', 'roll_number'] }]
    });
    const names = allotments.map((item) => item.AllotmentStudent?.userName).filter(Boolean);
    text += `\nRoommates: ${names.length ? names.map((name) => `• ${name}`).join('\n') : 'No roommates recorded'}`;
  }
  return text;
}

async function feeText(studentIds) {
  const [fees, studentFees] = await Promise.all([
    Fee.findAll({ where: { student_id: { [Op.in]: studentIds } } }),
    StudentFee.findAll({ where: { student_id: { [Op.in]: studentIds } } })
  ]);
  const all = [...fees, ...studentFees];
  const pending = all.filter((fee) => ['pending', 'overdue'].includes(fee.status));
  const paid = all.filter((fee) => fee.status === 'paid');
  return `💰 **Fee Status**\nPending: ${money(pending.reduce((sum, fee) => sum + Number(fee.amount), 0))}\nPaid records: ${paid.length}\nPending records: ${pending.length}`;
}

async function leaveText(studentIds) {
  const leaves = await Leave.findAll({ where: { student_id: { [Op.in]: studentIds } }, order: [['from_date', 'DESC']], limit: 5 });
  if (!leaves.length) return '📋 No leave requests were found.';
  return `📋 **Leave Status**\n${leaves.map((leave) => `• ${leave.status.toUpperCase()} — ${dateOnly(leave.from_date)} to ${dateOnly(leave.to_date)}`).join('\n')}`;
}

async function complaintsText(studentIds, hostelId) {
  const where = studentIds?.length ? { student_id: { [Op.in]: studentIds } } : {};
  const include = !studentIds?.length && hostelId
    ? [{ model: User, as: 'Student', attributes: [], where: { hostel_id: hostelId }, required: true }]
    : [];
  const complaints = await Complaint.findAll({ where, include, order: [['createdAt', 'DESC']], limit: 8 });
  const pending = complaints.filter((item) => !['resolved', 'closed'].includes(item.status));
  if (!complaints.length) return '🔧 No complaints were found.';
  return `🔧 **Complaints**\nPending: ${pending.length}\n${complaints.map((item) => `• #${item.id} ${item.subject} — ${item.status}`).join('\n')}`;
}

async function menuText(hostelId, message) {
  if (!hostelId) return 'I need a hostel assignment to look up the mess menu.';
  const tomorrow = /tomorrow/.test(message.toLowerCase());
  const meal = (message.toLowerCase().match(/breakfast|lunch|dinner|snacks/) || [])[0];
  const requestedDate = new Date();
  if (tomorrow) requestedDate.setDate(requestedDate.getDate() + 1);
  const where = { hostel_id: hostelId, scheduled_date: dateOnly(requestedDate), status: { [Op.ne]: 'cancelled' } };
  if (meal) where.meal_time = meal;
  const schedules = await MenuSchedule.findAll({ where, include: [Menu], order: [['meal_time', 'ASC']] });
  if (!schedules.length) return `🍛 No ${tomorrow ? "tomorrow's" : "today's"}${meal ? ` ${meal}` : ''} menu has been scheduled yet.`;
  return `🍛 **${tomorrow ? "Tomorrow's" : "Today's"} Menu**\n${schedules.map((item) => `• ${item.meal_time}: ${item.Menu?.name || 'Menu'}${item.Menu?.description ? ` — ${item.Menu.description}` : ''}`).join('\n')}`;
}

async function staffSummary(hostelId) {
  const scope = hostelId ? { hostel_id: hostelId } : {};
  const [students, rooms, occupied, pendingComplaints, pendingLeaves] = await Promise.all([
    User.count({ where: scope }),
    HostelRoom.count({ where: scope }),
    HostelRoom.count({ where: { ...scope, is_occupied: true } }),
    Complaint.count({ where: { status: { [Op.in]: ['submitted', 'in_progress'] } } }),
    Leave.count({ where: { status: 'pending' } })
  ]);
  return `📊 **Hostel Summary**\nUsers: ${students}\nRooms: ${rooms}\nOccupied: ${occupied}\nVacant: ${Math.max(rooms - occupied, 0)}\nPending complaints: ${pendingComplaints}\nPending leave requests: ${pendingLeaves}`;
}

router.post('/', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim().slice(0, 500);
    if (!message) return res.status(400).json({ message: 'Please enter a message.' });
    const role = roleOf(req.user);
    res.locals.chatRole = role;
    const intent = detectIntent(message);
    const selfId = req.user.userId;
    const scopedHostelId = role === 'admin' ? null : req.user.hostel_id;
    const parentStudentIds = role === 'parent' ? await linkedStudentIds(selfId) : [];
    const personalIds = role === 'parent' ? parentStudentIds : [selfId];

    // The student quick action must answer with the assigned room first,
    // rather than only redirecting to the room screen.
    if (role === 'student' && /^(?:my )?room$/i.test(message)) {
      return reply(res, 'ROOM', await roomText(selfId, false), ['My leave status', 'Fee status', 'Today’s menu']);
    }
    if (role === 'student' && /^(?:food order|mess menu)$/i.test(message)) {
      return reply(res, 'AVAILABLE_FOOD', await availableFoodText(), ['My food orders', 'Today’s menu', 'My mess charges']);
    }
    if (role === 'student' && /^(?:(?:apply|my) )?(?:outpass|gate ?pass)$/i.test(message)) {
      return reply(res, 'OUTPASS_STATUS', await outpassText(selfId), ['My leaves', 'My room', 'My fees']);
    }
    if (role === 'student' && /^(?:apply )?leave$/i.test(message)) {
      return reply(res, 'LEAVE_STATUS', await leaveText([selfId]), ['My outpass', 'My room', 'My fees']);
    }
    if (role === 'student' && /^(?:my )?fees?$/i.test(message)) {
      return reply(res, 'FEE_STATUS', await feeText([selfId]), ['My room', 'My leaves', 'My complaints']);
    }
    if (role === 'student' && /^(?:raise )?complaint$/i.test(message)) {
      return reply(res, 'COMPLAINT_STATUS', await complaintsText([selfId]), ['My complaints', 'My room', 'My fees']);
    }

    if (role === 'warden' && /^(?:search|find|enroll) student$/i.test(message)) {
      return reply(res, 'STUDENT_LIST', await studentListText(role, scopedHostelId), ['Leave requests', 'Pending gate passes', 'Manage complaints']);
    }
    if (role === 'warden' && /^(?:pending )?(?:gate ?passes|outpasses)$/i.test(message)) {
      return reply(res, 'OUTPASS_STATUS', await staffOutpassText(scopedHostelId), ['Leave requests', 'Student list', 'Room allotment']);
    }
    if (role === 'warden' && /^leave requests$/i.test(message)) {
      return reply(res, 'LEAVE_REQUESTS', await pendingLeavesText(role, scopedHostelId), ['Student list', 'Pending gate passes', 'Manage complaints']);
    }
    if (role === 'warden' && /^(?:room allotment|manage rooms)$/i.test(message)) {
      return reply(res, 'ROOM_SUMMARY', await staffSummary(scopedHostelId), ['Student list', 'Leave requests', 'Manage complaints']);
    }
    if (role === 'warden' && /^(?:manage )?complaints$/i.test(message)) {
      return reply(res, 'COMPLAINTS', await complaintsText(null, scopedHostelId), ['Student list', 'Leave requests', 'Pending gate passes']);
    }

    if (role === 'admin' && /^(?:admin )?dashboard$/i.test(message)) {
      return reply(res, 'ADMIN_SUMMARY', await staffSummary(null), ['Student list', 'Manage hostels', 'Outpass logs']);
    }
    if (role === 'admin' && /^manage hostels$/i.test(message)) {
      return reply(res, 'HOSTELS', await hostelsText(), ['Student list', 'Manage sessions', 'Room management']);
    }
    if (role === 'admin' && /^(?:room management|manage rooms)$/i.test(message)) {
      return reply(res, 'ROOM_SUMMARY', await staffSummary(null), ['Student list', 'Manage hostels', 'Outpass logs']);
    }
    if (role === 'admin' && /^create user$/i.test(message)) {
      const [userCount, roles] = await Promise.all([User.count(), Role.findAll({ attributes: ['roleName'], order: [['roleName', 'ASC']] })]);
      return reply(res, 'USERS', `👤 **User Accounts**\nTotal accounts: ${userCount}\nRoles: ${roles.map((item) => item.roleName).join(', ') || 'None'}`, ['Student list', 'Manage hostels', 'Manage sessions']);
    }
    if (role === 'admin' && /^manage sessions$/i.test(message)) {
      return reply(res, 'SESSIONS', await sessionsText(), ['Manage hostels', 'Student list', 'Outpass logs']);
    }
    if (role === 'admin' && /^outpass logs$/i.test(message)) {
      return reply(res, 'OUTPASS_LOGS', await staffOutpassText(null), ['Student list', 'Room management', 'Admin dashboard']);
    }

    if (role === 'mess' && /^(?:manage menus|menu planner)$/i.test(message)) {
      return reply(res, 'MENU', await menuText(req.user.hostel_id, message), ['Food orders', 'Stock management', 'Mess reports']);
    }
    if (role === 'mess' && /^(?:stock|stock management)$/i.test(message)) {
      return reply(res, 'STOCK', await stockText(req.user.hostel_id), ['Food orders', 'Manage menus', 'Mess reports']);
    }
    if (role === 'mess' && /^(?:daily )?meal entry$/i.test(message)) {
      return reply(res, 'FOOD_ORDERS', await foodOrdersText(req.user.hostel_id), ['Manage menus', 'Stock management', 'Mess reports']);
    }
    if (role === 'mess' && /^food orders$/i.test(message)) {
      return reply(res, 'FOOD_ORDERS', await foodOrdersText(req.user.hostel_id), ['Manage menus', 'Stock management', 'Mess reports']);
    }
    if (role === 'mess' && /^(?:mess )?reports?$/i.test(message)) {
      return reply(res, 'MESS_SUMMARY', await staffSummary(req.user.hostel_id), ['Food orders', 'Manage menus', 'Stock management']);
    }

    const navigationOption = getNavigationOption(role, message);
    if (navigationOption) {
      const [, navigationPath, text] = navigationOption;
      return reply(res, 'NAVIGATE', text, [], navigationPath);
    }

    if (intent === 'MESS_REPORTS' && role === 'mess') {
      return reply(res, intent, 'Opening the Mess Reports dashboard. You can view consumption and daily expense reports there.', [], '/consumption-report');
    }
    if (intent === 'STOCK_MANAGEMENT' && role === 'mess') {
      return reply(res, intent, 'Opening Stock Management. You can view and update the current inventory there.', [], '/stock');
    }
    if (intent === 'FOOD_ORDERS' && role === 'mess') {
      return reply(res, intent, await foodOrdersText(req.user.hostel_id), [], '/food-orders');
    }
    if (intent === 'MESS_MENU') return reply(res, intent, await menuText(req.user.hostel_id, message), ['Today’s menu', 'Tomorrow’s menu', "What's for dinner?"]);
    if (intent === 'MESS_FEEDBACK' && role === 'mess') return reply(res, intent, '📝 I can help record mess feedback. Please open the Food Complaint/Concern page and submit the details there; the existing workflow keeps feedback attributable and auditable.', ['Today’s menu', 'Tomorrow’s menu', 'Meal attendance']);
    if (intent === 'STUDENTS' && role === 'parent') {
      if (!personalIds.length) return reply(res, intent, "I couldn't find a student linked to your parent account.");
      const student = await User.findByPk(personalIds[0], { attributes: ['userName', 'roll_number', 'hostel_id'] });
      return reply(res, intent, `👨‍🎓 **Student Details**\nName: ${student?.userName || '—'}\nStudent ID: ${student?.roll_number || '—'}\n${await roomText(personalIds[0], false)}`, ['Room', 'Leave status', 'Fee status']);
    }
    if (intent === 'ROOM' && ['student', 'parent'].includes(role)) return reply(res, intent, await roomText(personalIds[0]), ['My leave status', 'Fee status', 'Today’s menu']);
    if (intent === 'FEES' && ['student', 'parent'].includes(role)) return reply(res, intent, await feeText(personalIds), ['My room', 'Leave status', 'My complaints']);
    if (intent === 'LEAVE' && ['student', 'parent'].includes(role)) return reply(res, intent, await leaveText(personalIds), ['Apply for leave', 'My room', 'Fee status']);
    if (intent === 'COMPLAINTS' && ['student', 'parent'].includes(role)) return reply(res, intent, await complaintsText(personalIds), ['My complaints', 'Today’s menu', 'My room']);
    if (intent === 'NOTICES' && role === 'parent') {
      const notices = await HostelNotice.findAll({ where: { [Op.or]: [{ hostel_id: req.user.hostel_id }, { hostel_id: null }] }, order: [['createdAt', 'DESC']], limit: 5 });
      return reply(res, intent, notices.length ? `📢 **Notices**\n${notices.map((notice) => `• ${notice.title}: ${notice.content}`).join('\n')}` : '📢 No notices are available right now.');
    }
    if (['warden', 'admin'].includes(role) && intent === 'ROOM') {
      const roomNumber = message.match(/room\s*#?\s*([\w-]+)/i)?.[1];
      if (roomNumber) {
        const room = await HostelRoom.findOne({ where: { ...staffScope(role, scopedHostelId), room_number: roomNumber } });
        if (!room) return reply(res, intent, `I couldn't find room ${roomNumber}.`);
        const allotments = await RoomAllotment.findAll({ where: { room_id: room.id, is_active: true }, include: [{ model: User, as: 'AllotmentStudent', attributes: ['userName', 'roll_number'] }] });
        return reply(res, intent, `🏠 **Room ${room.room_number}**\nFloor: ${room.floor ?? '—'}\nOccupants: ${allotments.length ? allotments.map((item) => `• ${item.AllotmentStudent?.userName} (${item.AllotmentStudent?.roll_number || '—'})`).join('\n') : 'Vacant'}`);
      }
      return reply(res, intent, await staffSummary(scopedHostelId), ['List students', 'Pending complaints', 'Pending leave requests']);
    }
    if (['warden', 'admin'].includes(role) && intent === 'STUDENTS') {
      const query = message.match(/(?:stu\d+|find|search|student|summary)\s+(.+)/i)?.[1]?.trim() || message.match(/\b(STU\d+)\b/i)?.[1];
      if (!query) return reply(res, intent, await studentListText(role, scopedHostelId), ['List students', 'Find student', 'Room status']);
      if (!query) return reply(res, intent, 'Please provide a student name or roll number, for example: “Find STU1024”.');
      const students = await User.findAll({ where: { ...(req.user.hostel_id ? { hostel_id: req.user.hostel_id } : {}), [Op.or]: [{ roll_number: { [Op.like]: `%${query}%` } }, { userName: { [Op.like]: `%${query}%` } }] }, attributes: ['userId', 'userName', 'roll_number'], limit: 5 });
      return reply(res, intent, students.length ? `🔎 **Student Results**\n${students.map((student) => `• ${student.userName} — ${student.roll_number || `ID ${student.userId}`}`).join('\n')}` : `I couldn't find a student matching “${query}”.`);
    }
    if (['warden', 'admin'].includes(role) && intent === 'LEAVE') {
      const leaves = await Leave.findAll({ where: { status: 'pending' }, include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number'], where: staffScope(role, scopedHostelId), required: true }], limit: 10 });
      return reply(res, intent, leaves.length ? `📋 **Pending Leave Requests**\n${leaves.map((leave) => `• ${leave.Student?.userName || 'Student'} — ${dateOnly(leave.from_date)} to ${dateOnly(leave.to_date)}`).join('\n')}` : '📋 There are no pending leave requests.');
    }
    if (['warden', 'admin'].includes(role) && intent === 'COMPLAINTS') return reply(res, intent, await complaintsText(null, scopedHostelId), ['List students', 'Pending leave requests', 'Room status']);
    if (['warden', 'admin'].includes(role) && intent === 'FEES') {
      const scope = staffScope(role, scopedHostelId);
      const fees = await StudentFee.findAll({ where: scope });
      const pending = fees.filter((fee) => fee.status === 'pending');
      return reply(res, intent, `💰 **Fee Statistics**\nCollected: ${money(fees.filter((fee) => fee.status === 'paid').reduce((sum, fee) => sum + Number(fee.amount), 0))}\nPending: ${money(pending.reduce((sum, fee) => sum + Number(fee.amount), 0))}\nPending records: ${pending.length}`);
    }
    if (['warden', 'admin'].includes(role) && intent === 'ATTENDANCE') {
      const absent = await Attendance.findAll({ where: { ...staffScope(role, scopedHostelId), date: dateOnly(), status: 'A' }, include: [{ model: User, as: 'Student', attributes: ['userName', 'roll_number'] }], limit: 20 });
      return reply(res, intent, absent.length ? `👥 **Absent Today**\n${absent.map((item) => `• ${item.Student?.userName || 'Student'} (${item.Student?.roll_number || '—'})`).join('\n')}` : '👥 No absent students are recorded for today.');
    }
    if (['warden', 'admin', 'mess'].includes(role) && intent === 'SUMMARY') return reply(res, intent, await staffSummary(req.user.hostel_id), ['Room occupancy', 'Pending complaints', 'Today’s menu']);
    return reply(res, 'UNKNOWN', "I'm not sure how to help with that yet. Try asking about rooms, leave, mess, complaints, fees, or hostel statistics.", ['My room', 'Today’s menu', 'Leave status']);
  } catch (error) {
    console.error('HostelMate chat error:', error);
    return res.status(500).json({ message: "I couldn't retrieve that information right now. Please try again." });
  }
});

export default router;
