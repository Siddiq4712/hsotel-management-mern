import ExcelJS from 'exceljs';
import { Hostel } from '../models/index.js';
import { dailyRateReportScope } from '../middleware/workspaceScope.js';
import { combineDailyRateReports, loadDailyRateReport } from '../services/dailyRateReport.js';
import { addDailyRateSheet, addHistoricalDailyRateSheet } from '../utils/dailyRateWorkbook.js';

async function addReportSheet(workbook, report, allHostels) {
  const title = report.approvedStatement ? 'August 2026 Daily Rate' : 'Daily Rate Calculation';
  const name = allHostels ? `${report.hostel.id} ${title}`.slice(0, 31) : title;
  if (report.approvedStatement) return addHistoricalDailyRateSheet(workbook, name, report.data);
  const hostel = await Hostel.findByPk(report.hostel.id);
  return addDailyRateSheet(workbook, name, report.data, hostel.name, report.startDate);
}

async function sendWorkbook(res, workbook, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', filename);
  await workbook.xlsx.write(res);
  return res.end();
}

export async function generateDailyRateReport(req, res) {
  let scope;
  try {
    scope = await dailyRateReportScope(req);
    if (scope.status) return res.status(scope.status).json({ message: scope.message });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  try {
    const { month, year, export: exportToExcel } = req.query;
    const reports = [];
    for (const hostel of scope.hostels) {
      reports.push({ hostel, ...await loadDailyRateReport(hostel.id, month, year) });
    }
    const [report] = reports;
    if (exportToExcel !== 'true' || !reports.length) {
      if (scope.allHostels) return res.json(combineDailyRateReports(reports, scope.historicalPeriod));
      return res.json({ success: true, data: report.data, historicalImport: report.historicalImport });
    }

    const workbook = new ExcelJS.Workbook();
    for (const entry of reports) await addReportSheet(workbook, entry, scope.allHostels);
    if (scope.allHostels) return await sendWorkbook(res, workbook, 'attachment; filename=All-Hostels-Report.xlsx');
    const filename = report.approvedStatement
      ? 'attachment; filename=August-2026-daily-rate.xlsx'
      : `attachment; filename="DailyRateCalculation_${year}_${month}.xlsx"`;
    return await sendWorkbook(res, workbook, filename);
  } catch (error) {
    console.error('Error generating daily rate report:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
}
