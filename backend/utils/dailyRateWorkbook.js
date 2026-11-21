import moment from 'moment';

export function addDailyRateSheet(workbook, name, reportData, hostelName, startDate) {
  const worksheet = workbook.addWorksheet(name);

  // Headers
  worksheet.addRow([`${hostelName}, K.R.Nagar`]);
  worksheet.mergeCells('A1:B1');
  worksheet.getCell('A1').font = { bold: true, size: 14, name: 'Arial' };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.addRow([`DAILY RATE CALCULATION ${moment(startDate).format('MMMM YYYY').toUpperCase()}`]);
  worksheet.mergeCells('A2:B2');
  worksheet.getCell('A2').font = { bold: true, size: 12, name: 'Arial' };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
  worksheet.addRow([]);

  // Expense Table
  const expenseHeader = worksheet.addRow(['Particulars', 'Amount (Rs)']);
  expenseHeader.font = { bold: true };
  expenseHeader.eachCell(cell => cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } });

  reportData.expenses.forEach((exp, index) => {
    worksheet.addRow([`${index + 1}. ${exp.name}`, parseFloat(exp.amount)]);
  });

  // Sub Total
  const subTotalRow = worksheet.addRow(['Sub total', reportData.subTotal]);
  subTotalRow.font = { bold: true };
  subTotalRow.getCell(2).border = { top: { style: 'thin' }, bottom: { style: 'double' }};

  // Deductions
  worksheet.addRow([]);
  worksheet.addRow(['Cash Token : (Less)', reportData.deductions.cashToken.amount > 0 ? -reportData.deductions.cashToken.amount : 0]);

  const creditTokenRow = worksheet.addRow([`Credit Token : (Sister Concern Bill.) ${reportData.deductions.creditToken.description}`]);
  creditTokenRow.getCell(2).value = reportData.deductions.creditToken.amount > 0 ? -reportData.deductions.creditToken.amount : 0;

  worksheet.addRow(['Student Additional Credit Token(V & NV meals)', reportData.deductions.specialOrders.amount > 0 ? -reportData.deductions.specialOrders.amount : 0]);
  worksheet.addRow(['Student Guest Income', reportData.deductions.guestIncome.amount > 0 ? -reportData.deductions.guestIncome.amount : 0]);

  // Total Expenses
  worksheet.addRow([]);
  const totalRow = worksheet.addRow(['Total Expenses =', reportData.totalExpenses]);
  totalRow.font = { bold: true };
  totalRow.getCell(2).border = { top: { style: 'thin' }, bottom: { style: 'double' }};

  // Mess Days
  const messDaysRow = worksheet.addRow([`Billable food days = ${reportData.totalManDays}`, '']);
  worksheet.addRow([reportData.waterIncluded ? 'Water included in historical expenses' : 'Water charged separately (not reduced)', reportData.waterIncluded ? reportData.includedWaterTotal : reportData.waterTotal || 0]);
  worksheet.addRow([reportData.waterIncluded ? 'Net expenses including water' : 'Net food expenses', reportData.foodExpenses ?? reportData.totalExpenses]);
  messDaysRow.font = { bold: true };

  // Daily Rate
  const dailyRateRow = worksheet.addRow(['Daily Rate = Total Expenses / Mess Days', reportData.dailyRate]);
  dailyRateRow.font = { bold: true };
  dailyRateRow.getCell(2).numFmt = '#,##0.00';

  // Formatting
  worksheet.getColumn('A').width = 60;
  worksheet.getColumn('B').width = 20;
  worksheet.getColumn('B').numFmt = '#,##0.00';
  worksheet.getColumn('B').alignment = { horizontal: 'right' };
}

export function addHistoricalDailyRateSheet(workbook, name, daily) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(['August 2026 historical calculation', 'Amount']);
  if (daily.scopeLabel) sheet.addRow(['Hostels covered', daily.scopeLabel]);
  for (const row of daily.expenses) sheet.addRow([row.name, row.amount]);
  sheet.addRow(['Gross expenses', daily.subTotal]);
  for (const [name, value] of Object.entries(daily.deductions)) sheet.addRow([name, -value.amount]);
  sheet.addRow(['Net expenses', daily.totalExpenses]);
  sheet.addRow(['Man-days', daily.totalManDays]);
  sheet.addRow(['Approved daily rate', daily.dailyRate]);
  sheet.columns = [{ width: 45 }, { width: 22 }];
}
