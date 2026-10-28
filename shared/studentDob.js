export function readStudentDob(student = {}) {
  const keys = ['date_of_birth', 'dateOfBirth', 'dob', 'DOB', 'DateOfBirth', 'dateofbirth', 'birth_date', 'birthDate', 'student_dob'];
  for (const source of [student, student.raw]) {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
  }
  return '';
}

export function normalizeStudentDob(value) {
  let year, month, day;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    year = value.getUTCFullYear(); month = value.getUTCMonth() + 1; day = value.getUTCDate();
  } else {
    const text = String(value ?? '').trim();
    let match;
    if ((match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/))) {
      [, year, month, day] = match;
    } else if ((match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) {
      [, day, month, year] = match;
    } else if (/^\d{7,8}$/.test(text)) {
      const padded = text.padStart(8, '0');
      day = padded.slice(0, 2); month = padded.slice(2, 4); year = padded.slice(4);
    } else {
      throw new Error('A valid Date of Birth is required for a new student (DDMMYYYY, DD/MM/YYYY or YYYY-MM-DD).');
    }
  }
  year = Number(year); month = Number(month); day = Number(day);
  const date = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day || date.getTime() > todayUtc) {
    throw new Error('Date of Birth must be a valid date that is not in the future.');
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function passwordFromDob(value) {
  const [year, month, day] = normalizeStudentDob(value).split('-');
  return `${day}${month}${year}`;
}
