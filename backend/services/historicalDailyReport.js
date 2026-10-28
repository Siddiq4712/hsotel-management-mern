import { Op } from 'sequelize';
import { Hostel } from '../models/index.js';
import { HistoricalBilling, getHistoricalBilling } from '../utils/historicalBilling.js';
import { hostelPolicy, policyError } from './inventoryBilling.js';

// Report-only lookup: the approved August statement covers the shared boys' group.
// Do not use this lookup to create bills or redistribute imported student charges.
export async function historicalDailyReport(hostelId, month, year, transaction) {
  if (Number(month) !== 8 || Number(year) !== 2026) return null;
  const policy = await hostelPolicy(hostelId, '2026-08-01', transaction);
  if (policy.mode !== 'shared') return getHistoricalBilling(hostelId, month, year);
  const sources = await HistoricalBilling.findAll({
    where: { hostel_id: { [Op.in]: policy.hostel_ids }, month, year }, transaction
  });
  if (!sources.length) return null;
  if (sources.length !== 1) throw policyError('Multiple historical statements belong to this shared group. Review their coverage before combining them.');
  const hostels = await Hostel.findAll({
    where: { id: { [Op.in]: policy.hostel_ids } }, attributes: ['id', 'name'], order: [['id', 'ASC']], transaction
  });
  const payload = sources[0].payload;
  return { ...payload, daily: { ...payload.daily, historicalImport: true,
    billingMode: 'shared', coveredHostelIds: policy.hostel_ids,
    scopeLabel: hostels.map(hostel => hostel.name).join(' + ') } };
}
