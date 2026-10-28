import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import ExcelJS from 'exceljs';

// A source-backed monthly snapshot preserves approved historical rates and rounding.
// It does not create fictional daily attendance or inventory movements.
export const HistoricalBilling = sequelize.define('HistoricalBilling', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  source_hash: { type: DataTypes.STRING(64), allowNull: false },
  payload: { type: DataTypes.JSON, allowNull: false }
}, { tableName: 'tbl_HistoricalBilling', indexes: [{ unique: true, fields: ['hostel_id', 'month', 'year'] }] });

export async function getHistoricalBilling(hostel_id, month, year) {
  // Only the explicitly imported period uses this historical workflow.
  if (Number(month) !== 8 || Number(year) !== 2026) return null;
  try {
    const row = await HistoricalBilling.findOne({ where: { hostel_id, month, year } });
    return row?.payload || null;
  } catch (error) {
    if (error.original?.code === 'ER_NO_SUCH_TABLE') return null;
    throw error;
  }
}

export function monthlyHistoricalReport(payload, college) {
  const data = payload.rows.filter(row => !college || college === 'all' || row.college === college);
  const summary = { ...payload.summary, totalMessAmount: 0, totalAdditionalAmount: 0, totalBedCharges: 0,
    totalHinduIndianExpress: 0, grandTotal: 0 };
  for (const row of data) {
    summary.totalMessAmount += row.messAmount;
    summary.totalAdditionalAmount += row.additionalAmount;
    summary.totalBedCharges += row.bedCharges;
    summary.totalHinduIndianExpress += row.hinduIndianExpress;
    summary.grandTotal += row.finalAmount;
  }
  for (const key of ['totalMessAmount', 'totalAdditionalAmount', 'totalBedCharges', 'totalHinduIndianExpress', 'grandTotal']) {
    summary[key] = Math.round(summary[key] * 100) / 100;
  }
  return { success: true, data, summary, historicalImport: true };
}

export async function sendHistoricalDailyReport(res, payload, exportToExcel) {
  if (exportToExcel !== 'true') return res.json({ success: true, data: payload.daily, historicalImport: true });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('August 2026 Daily Rate');
  sheet.addRow(['August 2026 historical calculation', 'Amount']);
  if (payload.daily.scopeLabel) sheet.addRow(['Hostels covered', payload.daily.scopeLabel]);
  for (const row of payload.daily.expenses) sheet.addRow([row.name, row.amount]);
  sheet.addRow(['Gross expenses', payload.daily.subTotal]);
  for (const [name, value] of Object.entries(payload.daily.deductions)) sheet.addRow([name, -value.amount]);
  sheet.addRow(['Net expenses', payload.daily.totalExpenses]);
  sheet.addRow(['Man-days', payload.daily.totalManDays]);
  sheet.addRow(['Approved daily rate', payload.daily.dailyRate]);
  sheet.columns = [{ width: 45 }, { width: 22 }];
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=August-2026-daily-rate.xlsx');
  await workbook.xlsx.write(res);
  return res.end();
}
