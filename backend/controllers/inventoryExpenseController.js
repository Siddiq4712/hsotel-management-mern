import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { MessDailyExpense, ExpenseType, User } from '../models/index.js';
import { consumptionPolicy, hostelPolicy, schoolToday, policyError } from '../services/inventoryBilling.js';

const include = [{ model: ExpenseType, as: 'ExpenseType', attributes: ['id', 'name'] }, { model: User, as: 'RecordedBy', attributes: ['userId', 'userName'] }];
function valid(body) {
  if (!Number.isInteger(Number(body.expense_type_id)) || Number(body.expense_type_id) <= 0 || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0 || !body.expense_date) throw policyError('Category, positive amount and expense date are required.', 400);
  return { expense_type_id: Number(body.expense_type_id), amount: Number(body.amount), expense_date: body.expense_date, description: body.description || null };
}
function accessible(row, policy, hostelId) {
  return row.hostel_id === Number(hostelId) || policy.mode === 'shared' && (policy.hostel_ids.includes(row.hostel_id) || row.hostel_id === null && row.inventory_id === policy.inventory_id);
}
export async function createScopedExpense(req, res) {
  try {
    const body = valid(req.body);
    const data = await sequelize.transaction({ isolationLevel: 'READ COMMITTED' }, async transaction => {
      const policy = await consumptionPolicy(req.user.hostel_id, body.expense_date, transaction);
      return MessDailyExpense.create({ ...body, hostel_id: policy.mode === 'shared' ? null : req.user.hostel_id,
        inventory_id: policy.inventory_id || null, recorded_by: req.user.userId }, { transaction });
    });
    res.status(201).json({ success: true, data });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message }); }
}
export async function listScopedExpenses(req, res) {
  try {
    const policy = await hostelPolicy(req.user.hostel_id, req.query.from_date || schoolToday());
    const where = policy.mode === 'shared' ? { [Op.or]: [{ hostel_id: { [Op.in]: policy.hostel_ids } }, { inventory_id: policy.inventory_id, hostel_id: null }] } : { hostel_id: req.user.hostel_id };
    if (req.query.from_date && req.query.to_date) where.expense_date = { [Op.between]: [req.query.from_date, req.query.to_date] };
    if (req.query.expense_type_id && req.query.expense_type_id !== 'all') where.expense_type_id = req.query.expense_type_id;
    const data = await MessDailyExpense.findAll({ where, include, order: [['expense_date', 'DESC'], ['id', 'DESC']] });
    res.json({ success: true, data });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message }); }
}
export async function getScopedExpense(req, res) {
  try {
    const row = await MessDailyExpense.findByPk(req.params.id, { include });
    const policy = await hostelPolicy(req.user.hostel_id, row?.expense_date || schoolToday());
    if (!row || !accessible(row, policy, req.user.hostel_id)) throw policyError('Expense not found in this billing scope.', 404);
    res.json({ success: true, data: row });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message }); }
}
async function mutate(req, res, remove) {
  try {
    const body = remove ? null : valid(req.body);
    await sequelize.transaction({ isolationLevel: 'READ COMMITTED' }, async transaction => {
      let row = await MessDailyExpense.findByPk(req.params.id, { transaction });
      const policy = await consumptionPolicy(req.user.hostel_id, row?.expense_date || schoolToday(), transaction);
      if (!row || !accessible(row, policy, req.user.hostel_id)) throw policyError('Expense not found in this billing scope.', 404);
      const originalDate = row.expense_date;
      row = await MessDailyExpense.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row || row.expense_date !== originalDate || !accessible(row, policy, req.user.hostel_id)) throw policyError('This expense changed. Refresh before editing it.');

      if (remove) await row.destroy({ transaction });
      else {
        const next = await consumptionPolicy(req.user.hostel_id, body.expense_date, transaction);
        if (next.mode !== policy.mode || next.inventory_id !== policy.inventory_id) throw policyError('An expense cannot be moved between billing scopes. Record a separate correction.');
        await row.update(body, { transaction });
      }
    });
    res.json({ success: true });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message }); }
}
export const updateScopedExpense = (req, res) => mutate(req, res, false);
export const deleteScopedExpense = (req, res) => mutate(req, res, true);
