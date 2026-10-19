export const MONTHLY_ATTENDANCE_HEADERS = ['Roll Number', 'Student Name', 'Mess Days'];
export const MAX_ATTENDANCE_ROWS = 1000;

export function attendancePeriod(month, year) {
  const m = Number(month), y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new Error('Select a valid month and year (2000–2100).');
  }
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { month: m, year: y, start, end: `${y}-${String(m).padStart(2, '0')}-${days}`, days };
}

const nameKey = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function validateMonthlyRows(rows, students, days) {
  if (!Array.isArray(rows) || !rows.length || rows.length > MAX_ATTENDANCE_ROWS) {
    throw new Error(`Upload between 1 and ${MAX_ATTENDANCE_ROWS} student rows.`);
  }
  const roster = new Map(students.filter(s => s.roll_number).map(s => [String(s.roll_number).trim().toLowerCase(), s]));
  const seen = new Set();
  return rows.map((row, index) => {
    const errors = [];
    const roll = String(row?.roll_number ?? '').trim();
    const name = String(row?.student_name ?? '').trim();
    const key = roll.toLowerCase();
    if (!roll || roll.length > 50) errors.push('A valid roll number is required.');
    if (seen.has(key)) errors.push('Duplicate roll number in this file.');
    seen.add(key);
    const student = roster.get(key);
    if (!student) errors.push('Student not found in the selected hostel, or account is inactive.');
    if (!name || name.length > 255) errors.push('Student name is required (maximum 255 characters).');
    else if (student && nameKey(name) !== nameKey(student.userName)) errors.push('Student name does not match this roll number.');
    const value = row?.mess_days;
    const messDays = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
    if (value === '' || value === null || value === undefined || String(value).trim() === '' ||
      !Number.isInteger(messDays) || messDays < 0 || messDays > days) errors.push(`Mess Days must be a whole number from 0 to ${days}.`);
    return { row: index + 2, roll_number: roll, student_name: name, mess_days: Number.isFinite(messDays) ? messDays : null,
      student_id: student?.userId ?? null, errors };
  });
}
