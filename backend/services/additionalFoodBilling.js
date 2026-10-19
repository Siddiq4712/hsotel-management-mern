import moment from 'moment';
import { Hostel, StudentFee, MessBill, MessBillingSnapshot } from '../models/index.js';
import { getHistoricalBilling } from '../utils/historicalBilling.js';
import { Inventory } from '../models/inventory.js';
import { hostelPolicy, assertBillingOpen } from './inventoryBilling.js';

export async function assertAdditionalFoodMonthOpen(hostelId, date, transaction) {
  const period = moment(date).utcOffset(330);
  const month = period.month() + 1, year = period.year();
  const policy = await hostelPolicy(hostelId, period.format('YYYY-MM-DD'), transaction);
  if (policy.mode === 'shared') await Inventory.findByPk(policy.inventory_id, { transaction, lock: transaction.LOCK.UPDATE });
  await Hostel.findByPk(hostelId, { transaction, lock: transaction.LOCK.UPDATE });
  await assertBillingOpen(policy, period.format('YYYY-MM-DD'), transaction);
  if (await getHistoricalBilling(hostelId, month, year)
      || await MessBill.count({ where: { hostel_id: hostelId, month, year }, transaction })
      || await MessBillingSnapshot.count({ where: { hostel_id: hostelId, month, year }, transaction })) {
    throw Object.assign(new Error('This month has finalized bills. Additional food charges cannot be changed.'), { status: 409 });
  }
}

export async function syncAdditionalFoodFee(order, transaction, { create = false, issuedBy } = {}) {
  const fee = await StudentFee.findOne({ where: { food_order_id: order.id }, transaction });
  if (!fee && !create) return; // Preserve unlinked legacy charges.
  const date = moment(order.requested_time).utcOffset(330);
  const values = {
    amount: order.status === 'cancelled' || order.payment_status !== 'pending' ? 0 : Number(order.total_amount),
    status: order.payment_status === 'paid' ? 'paid' : 'pending',
  };
  if (fee) return fee.update(values, { transaction });
  return StudentFee.create({ ...values, food_order_id: order.id, student_id: order.student_id,
    hostel_id: order.hostel_id, fee_type: 'special_food_charge', month: date.month() + 1, year: date.year(),
    issued_by: issuedBy, description: `Additional food for ${date.format('DD-MM-YYYY')} (Order #${order.id})${order.notes ? `: ${order.notes}` : ''}`,
  }, { transaction });
}
