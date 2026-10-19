import { Op } from 'sequelize';
import { Hostel, MessBillingSnapshot, MessBill } from '../models/index.js';
import { hostelPolicy } from './inventoryBilling.js';
import { Inventory } from '../models/inventory.js';
import { buildMonthlyMessReport } from './monthlyMessReport.js';

export async function freezeSharedBilling(hostel_id, month, year, transaction) {
  const billingPolicy = await hostelPolicy(hostel_id, `${year}-${String(month).padStart(2, '0')}-01`, transaction);
    if (billingPolicy.mode === 'shared') {
      await Inventory.findByPk(billingPolicy.inventory_id, { transaction, lock: transaction.LOCK.UPDATE });
      await Hostel.findAll({ where: { id: { [Op.in]: billingPolicy.hostel_ids } }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
      const snapshots = await MessBillingSnapshot.findAll({ where: { hostel_id: { [Op.in]: billingPolicy.hostel_ids }, month, year }, transaction });
      if (!snapshots.length) {
        if (await MessBill.count({ where: { hostel_id: { [Op.in]: billingPolicy.hostel_ids }, month, year }, transaction })) throw Object.assign(new Error('Existing bills prevent changing this shared period.'), { status: 409 });
        const reports = [];
        for (const id of billingPolicy.hostel_ids) reports.push({ id, report: await buildMonthlyMessReport(id, month, year, null, transaction) });
        if (!reports[0]?.report.calculation.sharedSummary?.totalManDays) throw Object.assign(new Error('The shared group has no billable student-days.'), { status: 400 });
        for (const { id, report } of reports) await MessBillingSnapshot.create({ hostel_id: id, month, year, payload: { data: report.data, summary: report.summary,
          calculation: { ...report.calculation, billing: { ...report.calculation.billing, byStudent: [...report.calculation.billing.byStudent] } } } }, { transaction });
      } else if (snapshots.length !== billingPolicy.hostel_ids.length) throw Object.assign(new Error('The shared group has incomplete billing snapshots. Review the period before finalizing.'), { status: 409 });
    }
}
