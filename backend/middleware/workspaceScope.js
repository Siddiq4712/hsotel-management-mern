import { Op } from 'sequelize';
import * as models from '../models/index.js';
import { inventoryPolicy } from '../services/inventoryBilling.js';

function entryHostelId(req) {
    return req.get('X-Entry-Hostel-Id') || req.body?.hostel_id || req.body?.hostelId || req.query.hostel_id;
}

const modelForPath = {
  students:'User',rooms:'HostelRoom','room-types':'RoomType','leave-requests':'Leave',complaints:'Complaint',
  suspensions:'Suspension',holidays:'Holiday','mess-bills':'MessBill','room-requests':'RoomRequest',
  'day-reduction-requests':'DayReductionRequest',rebates:'Rebate',menus:'Menu','menu-schedule':'MenuSchedule',
  'food-orders':'FoodOrder','daily-expenses':'MessDailyExpense','student-fees':'StudentFee',recipes:'Recipe',
  'special-consumption':'SpecialConsumption','credit-token':'CreditToken','additional-collections':'AdditionalCollection',
  attendance:'Attendance','bed-fees':'StudentFee'
};
const bodyResources = { student_id:'User',room_id:'HostelRoom',room_type_id:'RoomType',menu_id:'Menu',daily_consumption_id:'DailyConsumption',food_order_id:'FoodOrder' };

async function recordHostel(modelName, id) {
  if (!modelName || !id) return null;
  const record = await models[modelName]?.findByPk(id);
  if (!record) throw new Error('The selected record no longer exists. Refresh and try again.');
  return record.get('hostel_id') || (record.get('student_id') ? recordHostel('User',record.get('student_id')) : null);
}
export async function identifyHostel(req, path, portal) {
  const explicit = entryHostelId(req);
  const owners = new Set();
  for (const [key, model] of Object.entries(bodyResources)) {
    const id = await recordHostel(model, req.body?.[key] || req.query?.[key]);
    if (id) owners.add(Number(id));
  }
  if (Array.isArray(req.body?.student_ids) && req.body.student_ids.length) {
    const students = await models.User.findAll({where:{userId:{[Op.in]:req.body.student_ids}},attributes:['hostel_id']});
    students.forEach(student => { if (student.hostel_id) owners.add(Number(student.hostel_id)); });
  }
  for (const row of req.body?.attendanceData || []) {
    const owner=await recordHostel('User',row.student_id);
    if(owner)owners.add(Number(owner));
  }
  const segment = path.split('/')[1];
  const resourceId = req.params.student_id || req.params.menu_id || req.params.id;
  const inferred = await recordHostel(portal === 'outpass' ? 'Outpass' : modelForPath[segment], resourceId);
  if (inferred) owners.add(Number(inferred));
  if (explicit && explicit !== 'all') {
    const id = Number(explicit);
    if (!Number.isInteger(id) || id <= 0) throw new Error('Choose a valid hostel for this entry.');
    if ([...owners].some(owner => owner !== id)) throw new Error('The selected records do not belong to the hostel chosen for this entry.');
    return id;
  }
  if (owners.size > 1) throw new Error('Select records from one hostel for this operation.');
  return owners.size ? [...owners][0] : null;
}

export async function inventoryEntryScope(req, inventoryId) {
  const id = Number(inventoryId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Choose a valid inventory.');
  const inventory = await models.Inventory.findByPk(inventoryId);
  if (!inventory) throw new Error('Inventory not found.');
  const members = await models.InventoryHostel.findAll({ where: { inventory_id: inventory.id }, raw: true });
  const memberIds = members.map(member => member.hostel_id);
  const explicit = entryHostelId(req);
  if (explicit && !memberIds.includes(Number(explicit))) {
    throw new Error('The selected hostel does not use this inventory. Reload and choose its assigned inventory.');
  }
  const hostels = await models.Hostel.findAll({ where: { id: { [Op.in]: memberIds } }, order: [['id', 'ASC']] });
  if (!hostels.length) throw new Error('Assign at least one hostel to this inventory first.');
  return { inventory, hostels, explicit };
}

export async function distinctBillingHostels(hostels, month, year) {
  const assignments = await models.InventoryHostel.findAll({ raw: true });
  const inventoryByHostel = new Map(assignments.map(row => [row.hostel_id, row.inventory_id]));
  const date = month && year ? `${year}-${String(month).padStart(2, '0')}-01` : undefined;
  const policyByInventory = new Map();
  const seen = new Set();
  const unique = [];
  for (const hostel of hostels) {
    const inventoryId = inventoryByHostel.get(hostel.id);
    if (inventoryId && !policyByInventory.has(inventoryId)) {
      policyByInventory.set(inventoryId, await inventoryPolicy(inventoryId, date));
    }
    if (policyByInventory.get(inventoryId)?.mode === 'shared') {
      if (seen.has(inventoryId)) continue;
      seen.add(inventoryId);
    }
    unique.push(hostel);
  }
  return unique;
}

export async function staffEntryScope(req, { path, portal, method, poolRequest, inventoryId }) {
  const staff = req.staffWorkspace;
  const expectedRole = portal === 'outpass' ? 'warden' : portal;
  const sharedRead = staff.role === 'warden' && portal === 'mess' && method === 'get'
    && ['/students', '/menu-schedule'].includes(path);
  if (staff.role !== expectedRole && !sharedRead) {
    return { status: 403, message: 'Open the matching staff workspace for this action.' };
  }
  const owner = await identifyHostel(req, path, portal);
  if (owner && owner !== Number(staff.hostel.id)) return { status: 403, message: 'This record belongs to another hostel.' };
  if (poolRequest && !staff.inventory) return { status: 409, message: 'Assign an inventory to this hostel in Admin.' };
  if (inventoryId && Number(inventoryId) !== Number(staff.inventory?.id)) {
    return { status: 403, message: 'This inventory belongs to another workspace.' };
  }
  return { hostel: staff.hostel, inventory: staff.inventory };
}

export async function dailyRateReportScope(req) {
  if (req.user.role !== 'admin') return { hostels: [{ id: req.user.hostel_id }] };

  const { month, year } = req.query;
  const historicalPeriod = Number(year) === 2026 && [7, 8, 9].includes(Number(month));
  const inventoryId = req.get('X-Inventory-Id') || req.body?.inventory_id || req.query.inventory_id;
  const path = '/reports/daily-rate-calculation';
  if (req.staffWorkspace) {
    const staffScope = await staffEntryScope(req, {
      path, portal: 'mess', method: 'get', poolRequest: historicalPeriod && inventoryId, inventoryId
    });
    return staffScope.status ? staffScope : { hostels: [staffScope.hostel] };
  }

  if (historicalPeriod && inventoryId) {
    const { hostels, explicit } = await inventoryEntryScope(req, inventoryId);
    return { hostels: [hostels.find(hostel => hostel.id === Number(explicit)) || hostels[0]] };
  }
  const hostelId = await identifyHostel(req, path, 'mess');
  if (hostelId) {
    const hostel = await models.Hostel.findByPk(hostelId);
    return hostel ? { hostels: [hostel] } : { status: 400, message: 'Hostel not found.' };
  }
  const hostels = await models.Hostel.findAll({ order: [['id', 'ASC']] });
  return {
    hostels: historicalPeriod ? await distinctBillingHostels(hostels, month, year) : hostels,
    allHostels: true,
    historicalPeriod
  };
}

