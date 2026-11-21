import ExcelJS from 'exceljs';

export function buildUnitRateWorkbook(reportData, { inventoryName, monthName, monthAbbreviation, openingBasis }) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Unit Rate Calculation');

  // --- Header Rows ---
  worksheet.addRow([`NATIONAL ENGINEERING COLLEGE — ${inventoryName}`]);
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.addRow([`Unit Rate Calculation - ${monthName}`]);
  worksheet.getCell('A2').font = { bold: true, size: 14 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };
  worksheet.addRow(openingBasis ? [openingBasis] : []);

  const lastColumnLetter = 'J';

  // Merge title and subtitle rows across all columns
  worksheet.mergeCells(`A1:${lastColumnLetter}1`);
  worksheet.mergeCells(`A2:${lastColumnLetter}2`);
  if (openingBasis) worksheet.mergeCells(`A3:${lastColumnLetter}3`);

  // Header Row 1 - Main Categories
  const headerRow1Data = [
    'Sl. No',
    'Name of the Items',
    `Opening Balance ${monthAbbreviation}`, null, null, // Opening (3 cols)
    'Purchase during', null, null, // Purchase (3 cols)
    'Grand Total', null // Grand Total (2 cols)
  ];

  const headerRow1 = worksheet.addRow(headerRow1Data);

  // Header Row 2 - Sub-categories
  const headerRow2Data = [
    null, null, // Sl.No, Name
    'Qty', 'Old Unit Rate', 'Total Amount', // Opening
    'Qty', 'Unit Rate', 'Amount', // Purchase
    'Qty', 'Amount' // Grand Total
  ];

  const headerRow2 = worksheet.addRow(headerRow2Data);

  // Merging header cells (rows 4-5, 1-based)
  let currentHeaderCol = 1;
  worksheet.mergeCells(4, currentHeaderCol, 5, currentHeaderCol); currentHeaderCol++; // Sl. No
  worksheet.mergeCells(4, currentHeaderCol, 5, currentHeaderCol); currentHeaderCol++; // Name
  worksheet.mergeCells(4, currentHeaderCol, 4, currentHeaderCol + 2); currentHeaderCol += 3; // Opening Balance
  worksheet.mergeCells(4, currentHeaderCol, 4, currentHeaderCol + 2); currentHeaderCol += 3; // Purchase during
  worksheet.mergeCells(4, currentHeaderCol, 4, currentHeaderCol + 1); currentHeaderCol += 2; // Grand Total

  // Styling headers
  [headerRow1, headerRow2].forEach(row => {
    row.font = { bold: true };
    row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  // Set column widths
  worksheet.columns = [
    { key: 'sl_no', width: 5 },
    { key: 'name', width: 30 },
    { key: 'open_qty', width: 10 },
    { key: 'old_unit_rate', width: 12 },
    { key: 'open_total_amount', width: 15 },
    { key: 'purchase_qty', width: 10 },
    { key: 'purchase_unit_rate', width: 12 },
    { key: 'purchase_amount', width: 15 },
    { key: 'grand_total_qty', width: 10 },
    { key: 'grand_total_amount', width: 15 }
  ];

  // Data Rows
  let grandTotalOverallAmount = 0;
  let grandTotalQty = 0;

  for (const [index, item] of reportData.entries()) {
    const rowData = [];

    // Sl. No
    rowData.push(index + 1);

    // Name of the Items
    rowData.push(item.item_name + (item.unit_abbreviation ? ` (${item.unit_abbreviation})` : ''));

    // Opening Balance
    const openingQty = parseFloat(item.opening_qty || 0);
    const oldUnitRate = parseFloat(item.old_unit_rate || 0);
    const openingTotalAmount = item.opening_value == null ? openingQty * oldUnitRate : Number(item.opening_value);
    rowData.push(openingQty, oldUnitRate, openingTotalAmount);

    // Purchases during the month
    const purchaseQty = parseFloat(item.purchase_qty || 0);
    const lastUnitPrice = parseFloat(item.last_unit_price || 0);
    const purchaseAmount = parseFloat(item.purchase_amount || 0);
    rowData.push(purchaseQty, lastUnitPrice, purchaseAmount);

    // Grand Total
    const grandTotalQtyItem = openingQty + purchaseQty;
    const grandTotalAmount = openingTotalAmount + purchaseAmount;
    rowData.push(grandTotalQtyItem, grandTotalAmount);
    grandTotalOverallAmount += grandTotalAmount;
    grandTotalQty += grandTotalQtyItem;

    const newRow = worksheet.addRow(rowData);

    // Apply formatting for the new row
    newRow.eachCell((cell, colIndex) => { // colIndex is 1-based
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

      // Number formats
      if ([3, 6, 9].includes(colIndex)) {
        cell.numFmt = '0.000'; // Qty columns
      } else if ([4, 5, 7, 8, 10].includes(colIndex)) {
        cell.numFmt = '0.00'; // Rate and Amount columns
      }
    });
  }

  // Grand Total Row (for the entire report summary)
  const lastDataRowNumber = worksheet.lastRow.number;
  const totalRow = worksheet.getRow(lastDataRowNumber + 1);

  // Label "Grand Total" merged from B to H (before I=9)
  const grandTotalLabelStartCol = 2; // B
  const grandTotalLabelEndCol = 8; // H
  worksheet.mergeCells(lastDataRowNumber + 1, grandTotalLabelStartCol, lastDataRowNumber + 1, grandTotalLabelEndCol);

  totalRow.getCell(grandTotalLabelStartCol).value = 'Grand Total';
  totalRow.getCell(grandTotalLabelStartCol).font = { bold: true };
  totalRow.getCell(grandTotalLabelStartCol).alignment = { horizontal: 'right' };

  // Grand Total Qty in I (9)
  totalRow.getCell(9).value = grandTotalQty;
  totalRow.getCell(9).numFmt = '0.000';
  totalRow.getCell(9).font = { bold: true };

  // Grand Total Amount in J (10)
  totalRow.getCell(10).value = grandTotalOverallAmount;
  totalRow.getCell(10).numFmt = '0.00';
  totalRow.getCell(10).font = { bold: true };

  // Apply borders to the total row
  totalRow.eachCell((cell) => {
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Signatures
  const signatureRowNumber = worksheet.lastRow.number + 3; // 3 blank rows after the total row
  const signatureRow = worksheet.getRow(signatureRowNumber);

  signatureRow.getCell(2).value = 'ASSOCIATE WARDEN';
  signatureRow.getCell(2).font = { bold: true };
  signatureRow.getCell(2).alignment = { horizontal: 'center' };

  // Positions for WARDEN (col D=4) and DIRECTOR (col J=10)
  const wardenCol = 5;
  const directorCol = 10;

  signatureRow.getCell(wardenCol).value = 'WARDEN';
  signatureRow.getCell(wardenCol).font = { bold: true };
  signatureRow.getCell(wardenCol).alignment = { horizontal: 'center' };

  signatureRow.getCell(directorCol).value = 'DIRECTOR';
  signatureRow.getCell(directorCol).font = { bold: true };
  signatureRow.getCell(directorCol).alignment = { horizontal: 'center' };
  return workbook;
}
