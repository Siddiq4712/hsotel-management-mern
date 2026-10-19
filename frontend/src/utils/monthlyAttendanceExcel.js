import * as XLSX from 'xlsx';

export const ATTENDANCE_HEADERS = ['Roll Number', 'Student Name', 'Mess Days'];
export const ATTENDANCE_ROW_LIMIT = 1000;

export function makeAttendanceTemplate(students = []) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([ATTENDANCE_HEADERS,
    ...students.map(s => [String(s.roll_number || ''), s.userName, ''])]);
  sheet['!cols'] = [{ wch: 22 }, { wch: 38 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, sheet, 'Monthly Attendance');
  const instructions = XLSX.utils.aoa_to_sheet([
    ['Monthly attendance import instructions'],
    ['Select hostel and billing month on the Admin page before uploading.'],
    ['Keep the three headers unchanged in the first sheet.'],
    ['Roll Number and Student Name must match an existing active student in the selected hostel.'],
    ['Enter Mess Days as an integer from zero to the number of calendar days in the selected month.'],
    ['Blank Mess Days is an error. Enter 0 explicitly for zero billable days.'],
    ['Remove rows for students you are not importing. Maximum 1000 rows per file.'],
    ['Use text format for roll numbers to preserve leading zeros. Formulas are not accepted.'],
    ['Existing attendance, saved bills, and protected historical months cannot be overwritten.'],
    ['Import creates monthly totals only, not individual daily presence or absence.']
  ]);
  instructions['!cols'] = [{ wch: 110 }];
  XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
  return workbook;
}

export function parseAttendanceWorkbook(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet?.['!ref']) throw new Error('The first worksheet is empty.');
  const range = XLSX.utils.decode_range(sheet['!ref']);
  if (range.s.r !== 0 || range.s.c !== 0 || range.e.c !== 2 || range.e.r > ATTENDANCE_ROW_LIMIT) {
    throw new Error('Use the template: three columns, headers in row 1, and no more than 1000 student rows.');
  }
  for (let row = 0; row <= range.e.r; row++) for (let col = 0; col < 3; col++) {
    if (sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.f) throw new Error(`Formulas are not allowed (Excel row ${row + 1}). Paste values instead.`);
  }
  const values = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });
  if (ATTENDANCE_HEADERS.some((h, i) => String(values[0]?.[i] || '').trim() !== h)) {
    throw new Error(`Required headers: ${ATTENDANCE_HEADERS.join(' | ')}. Download the template.`);
  }
  // Preserve worksheet row numbers, even if the user leaves a blank line.
  const data = values.slice(1);
  while (data.length && data.at(-1).every(v => String(v).trim() === '')) data.pop();
  if (!data.length) throw new Error('Add at least one student row.');
  return data.map((row, index) => {
    const rollCell = sheet[`A${index + 2}`];
    return { roll_number: rollCell ? String(rollCell.t === 'n' ? XLSX.utils.format_cell(rollCell) : rollCell.v).trim() : '',
      student_name: String(row[1] || '').trim(), mess_days: row[2] ?? '' };
  });
}
