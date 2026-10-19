import { Op } from 'sequelize';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { InventoryBillingPolicy, InventoryMealEntry } from '../models/inventoryBilling.js';
import { DailyConsumption, MessDailyExpense, MessBillingSnapshot, MessBill } from '../models/index.js';

export const schoolToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const policyError = (message, status = 409) => Object.assign(new Error(message), { status });
export function datePeriod(date = schoolToday()) {
  const text = typeof date === 'string' ? date.slice(0, 10) : new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text)) || new Date(`${text}T00:00:00Z`).toISOString().slice(0, 10) !== text) throw policyError('Choose a valid date.', 400);
  return { date: text, start: `${text.slice(0, 7)}-01`, month: Number(text.slice(5, 7)), year: Number(text.slice(0, 4)) };
}
export async function inventoryPolicy(inventoryId, date, transaction) {
  const { start } = datePeriod(date);
  const policy = await InventoryBillingPolicy.findOne({ where: { inventory_id: inventoryId, effective_from: { [Op.lte]: start } }, order: [['effective_from', 'DESC']], transaction });
  if (policy) return { inventory_id: Number(inventoryId), mode: policy.mode, hostel_ids: policy.hostel_ids, effective_from: policy.effective_from };
  const first = await InventoryBillingPolicy.findOne({ where: { inventory_id: inventoryId }, order: [['effective_from', 'ASC']], transaction });
  if (first) return { inventory_id: Number(inventoryId), mode: 'hostel', hostel_ids: [], effective_from: null };
  const members = await InventoryHostel.findAll({ where: { inventory_id: inventoryId }, transaction });
  return { inventory_id: Number(inventoryId), mode: 'hostel', hostel_ids: members.map(row => row.hostel_id), effective_from: '1900-01-01' };
}
export async function hostelPolicy(hostelId, date, transaction) {
  const { start } = datePeriod(date);
  const policies = await InventoryBillingPolicy.findAll({ where: { effective_from: { [Op.lte]: start } }, order: [['effective_from', 'DESC'], ['id', 'DESC']], transaction });
  const seen = new Set();
  for (const row of policies) {
    if (seen.has(row.inventory_id)) continue;
    seen.add(row.inventory_id);
    if (row.hostel_ids.includes(Number(hostelId))) return { inventory_id: row.inventory_id, mode: row.mode, hostel_ids: row.hostel_ids, effective_from: row.effective_from };
  }
  const assignment = await InventoryHostel.findByPk(hostelId, { transaction });
  return assignment ? inventoryPolicy(assignment.inventory_id, date, transaction) : { mode: 'hostel', hostel_ids: [Number(hostelId)] };
}
export async function assertBillingOpen(policy, date, transaction) {
  const period = datePeriod(date);
  if (!policy.hostel_ids.length) throw policyError('No hostels belong to this billing group.');
  const where = { hostel_id: { [Op.in]: policy.hostel_ids }, month: period.month, year: period.year };
  const options = { where, transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) };
  if (await MessBillingSnapshot.findOne(options) || await MessBill.findOne(options)) throw policyError('This billing period is finalized. Use a controlled adjustment instead of changing its consumption or expenses.');
}
export async function consumptionPolicy(hostelId, date, transaction) {
  const policy = await hostelPolicy(hostelId, date, transaction);
  if (policy.mode === 'shared') {
    if (datePeriod(date).date > schoolToday()) throw policyError('Shared inventory consumption and expenses can only be recorded on or before today.', 400);
    await Inventory.findByPk(policy.inventory_id, { transaction, lock: transaction.LOCK.UPDATE });
    const assignment = await InventoryHostel.findByPk(hostelId, { transaction, lock: transaction.LOCK.UPDATE });
    if (assignment?.inventory_id !== policy.inventory_id) throw policyError('The hostel changed inventories. Record this historical adjustment through its original inventory.');
    await assertBillingOpen(policy, date, transaction);
  }
  return policy;
}
export async function hasPeriodActivity(inventoryId, ids, start, transaction) {
  const period = datePeriod(start);
  const end = new Date(Date.UTC(period.year, period.month, 0)).toISOString().slice(0, 10);
  const hosts = { hostel_id: { [Op.in]: ids } };
  return Boolean(await DailyConsumption.count({ where: { [Op.or]: [{ inventory_id: inventoryId }, hosts], consumption_date: { [Op.between]: [start, end] } }, transaction })
    || await InventoryMealEntry.count({ where: { inventory_id: inventoryId, date: { [Op.between]: [start, end] } }, transaction })
    || await MessDailyExpense.count({ where: { [Op.or]: [{ inventory_id: inventoryId }, hosts], expense_date: { [Op.between]: [start, end] } }, transaction })
    || await MessBillingSnapshot.count({ where: { ...hosts, month: period.month, year: period.year }, transaction })
    || await MessBill.count({ where: { ...hosts, month: period.month, year: period.year }, transaction }));
}

export async function consumptionReadScope(hostelId, date, transaction) {
  const policy = await hostelPolicy(hostelId, date, transaction);
  return policy.mode === 'shared' ? { [Op.or]: [{ hostel_id: { [Op.in]: policy.hostel_ids } }, { inventory_id: policy.inventory_id, hostel_id: null }] } : { hostel_id: hostelId };
}
