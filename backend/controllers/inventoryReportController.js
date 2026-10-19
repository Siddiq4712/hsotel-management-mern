import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { Hostel, Item, UOM, ItemCategory, DailyConsumption, MessDailyExpense, ExpenseType, InventoryTransaction, Store, ItemStock, InventoryBatch } from '../models/index.js';
import { inventoryPolicy, policyError } from '../services/inventoryBilling.js';
import { billingMonth } from '../services/billingDays.js';
import { buildMonthlyMessReport } from '../services/monthlyMessReport.js';

async function authorizedInventory(req, transaction) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw policyError('Choose a valid inventory.', 400);
  const inventory = await Inventory.findByPk(id, { transaction });
  if (!inventory) throw policyError('Inventory not found.', 404);
  if (req.user.role !== 'admin') {
    const own = await InventoryHostel.findByPk(req.user.hostel_id, { transaction });
    if (own?.inventory_id !== id) throw policyError('You can only report on your assigned inventory.', 403);
  }
  return inventory;
}
export async function reportPolicy(req, res) {
  try {
    const inventory = await authorizedInventory(req);
    const policy = await inventoryPolicy(inventory.id, req.query.date);
    const hostels = await Hostel.findAll({ where: { id: { [Op.in]: policy.hostel_ids } }, attributes: ['id', 'name'], raw: true });
    res.json({ success: true, data: { ...policy, inventory_name: inventory.name, hostels } });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message }); }
}
export async function inventoryReport(req, res) {
  let transaction;
  try {
    transaction = await sequelize.transaction({ isolationLevel: 'REPEATABLE READ' });
    const inventory = await authorizedInventory(req, transaction);
    const period = billingMonth(req.query.month, req.query.year);
    const format = req.query.format;
    if (!['preview', 'xlsx', 'csv', 'pdf'].includes(format)) throw policyError('Choose a report format before generating the report.', 400);
    const kind = req.query.kind;
    if (!['consumption', 'expenses', 'rate', 'billing', 'stock', 'purchases'].includes(kind)) throw policyError('Choose a valid report.', 400);
    const policy = await inventoryPolicy(inventory.id, period.start, transaction);
    const hosts = await Hostel.findAll({ where: { id: { [Op.in]: policy.hostel_ids } }, attributes: ['id', 'name'], raw: true, transaction });
    const physical = ['stock', 'purchases'].includes(kind);
    const shared = policy.mode === 'shared' || physical;
    const chosen = Number(req.query.hostel_id);
    if (!shared && !policy.hostel_ids.includes(chosen)) throw policyError('Choose a hostel belonging to this inventory for the selected month.', 400);
    if (shared && req.query.hostel_id) throw policyError('Inventory-wide reports cover the complete group; remove the hostel filter.', 400);
    const ids = shared ? policy.hostel_ids : [chosen];
    const hostName = id => hosts.find(hostel => hostel.id === id)?.name || 'Shared inventory';
    const financialWhere = shared ? { [Op.or]: [{ hostel_id: { [Op.in]: ids } }, { inventory_id: inventory.id, hostel_id: null }] } : { hostel_id: chosen };
    const range = { [Op.between]: [period.start, period.end] };
    let rows = [], summary = {};
    if (kind === 'consumption') {
      const data = await DailyConsumption.findAll({ where: { ...financialWhere, consumption_date: range }, include: [{ model: Item, as: 'tbl_Item' }, { model: UOM, as: 'UOM' }], order: [['consumption_date', 'ASC'], ['id', 'ASC']], transaction });
      rows = data.map(row => ({ Date: row.consumption_date, Hostel: hostName(row.hostel_id), Meal: row.meal_type, Item: row.tbl_Item?.name,
        Quantity: Number(row.quantity_consumed), Unit: row.UOM?.abbreviation, Cost: Number(row.total_cost) }));
      summary.totalCost = rows.reduce((sum, row) => sum + row.Cost, 0);
    } else if (kind === 'expenses') {
      const data = await MessDailyExpense.findAll({ where: { ...financialWhere, expense_date: range }, include: [{ model: ExpenseType, as: 'ExpenseType' }], order: [['expense_date', 'ASC']], transaction });
      rows = data.map(row => ({ Date: row.expense_date, Hostel: hostName(row.hostel_id), Category: row.ExpenseType?.name, Description: row.description, Amount: Number(row.amount) }));
      summary.additionalExpenses = rows.reduce((sum, row) => sum + row.Amount, 0);
    } else if (kind === 'rate' || kind === 'billing') {
      const reports = [];
      for (const id of ids) reports.push({ id, report: await buildMonthlyMessReport(id, period.month, period.year, null, transaction) });
      const c = reports[0]?.report.calculation;
      summary = c ? { billingMode: policy.mode, dailyRate: c.dailyRate, totalManDays: shared ? c.sharedSummary?.totalManDays ?? c.totalManDays : c.billing.totalManDays,
        grossExpenses: c.subTotal, deductions: c.totalDeductions, foodExpenses: c.foodExpenses, finalized: Boolean(c.finalized || c.legacyFinalized), waterIsSeparate: !c.historicalImport, historicalImport: Boolean(c.historicalImport) } : {};
      if (kind === 'rate') rows = c?.expenses.map(row => ({ Particulars: row.name, Amount: row.amount })) || [];
      else rows = reports.flatMap(({ id, report }) => report.data.map(row => ({ Hostel: hostName(id), Student: row.name, RegisterNumber: row.regNo,
        BaseDays: row.baseDays, ApprovedReductions: row.approvedReductionDays, MessDays: row.messDays, DailyRate: row.dailyRate,
        MessAmount: row.messAmount, Water: row.waterCharges, Additional: row.additionalAmount - row.waterCharges, Bed: row.bedCharges, Newspaper: row.hinduIndianExpress, Total: row.finalAmount })));
    } else if (kind === 'purchases') {
      const data = await InventoryTransaction.findAll({ where: { inventory_id: inventory.id, transaction_type: 'purchase', transaction_date: range }, include: [{ model: Item }, { model: Store }], order: [['transaction_date', 'ASC']], transaction });
      rows = data.map(row => ({ Date: row.transaction_date, Supplier: row.Store?.name, Item: row.Item?.name, Quantity: Number(row.quantity), Unit: row.unit,
        Rate: Number(row.unit_price), Value: Number(row.quantity) * Number(row.unit_price), Reference: row.notes?.split('\n')[0] || '' }));
    } else {
      const stocks = await ItemStock.findAll({ where: { inventory_id: inventory.id }, include: [{ model: Item, include: [{ model: UOM, as: 'UOM' }, { model: ItemCategory, as: 'tbl_ItemCategory' }] }], transaction });
      const batches = await InventoryBatch.findAll({ where: { inventory_id: inventory.id, status: 'active', quantity_remaining: { [Op.gt]: 0 } }, raw: true, transaction });
      rows = stocks.map(row => {
        const own = batches.filter(batch => batch.item_id === row.item_id);
        const qty = own.reduce((sum, batch) => sum + Number(batch.quantity_remaining), 0);
        const value = own.reduce((sum, batch) => sum + Number(batch.quantity_remaining) * Number(batch.unit_price), 0);
        return { Item: row.Item?.name, Category: row.Item?.tbl_ItemCategory?.name, Quantity: Number(row.current_stock), Unit: row.Item?.UOM?.abbreviation,
          Minimum: Number(row.minimum_stock), WeightedRate: qty ? value / qty : Number(row.Item?.unit_price || 0), StockValue: value };
      });
    }
    await transaction.commit();
    res.json({ success: true, data: { kind, format, scope: { inventory_id: inventory.id, inventory_name: inventory.name, billing_mode: policy.mode,
      level: shared ? 'inventory' : 'hostel', name: shared ? inventory.name : hostName(chosen), hostels: hosts.filter(hostel => ids.includes(hostel.id)),
      effective_from: policy.effective_from, month: period.month, year: period.year, stockAsOf: kind === 'stock' ? 'Current balance (not a historical month-end valuation)' : undefined }, summary, rows } });
  } catch (error) { if (transaction && !transaction.finished) await transaction.rollback(); res.status(error.status || 500).json({ success: false, message: error.message }); }
}
