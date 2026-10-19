import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attendancePeriod, validateMonthlyRows } from '../utils/monthlyAttendanceValidation.js';

const students = [{ userId: 8, roll_number: '00123', userName: 'R. ANISH' }];
const row = { roll_number: '00123', student_name: 'r anish', mess_days: 0 };
test('zero days and matching text roll numbers are valid', () => {
  const [result] = validateMonthlyRows([row], students, 31);
  assert.deepEqual(result.errors, []);
  assert.equal(result.student_id, 8);
  assert.equal(result.mess_days, 0);
});
test('calendar bounds include leap years and reject invalid periods', () => {
  assert.equal(attendancePeriod(2, 2028).days, 29);
  assert.equal(attendancePeriod(2, 2027).end, '2027-02-28');
  for (const args of [[0,2026], [13,2026], [1,0], [1.5,2026]]) assert.throws(() => attendancePeriod(...args));
});
test('blank, fractional, negative, excessive, and nonnumeric days fail', () => {
  for (const mess_days of ['', ' ', null, undefined, 1.5, -1, 32, true, 'abc']) {
    assert(validateMonthlyRows([{ ...row, mess_days }], students, 31)[0].errors.length > 0);
  }
});
test('duplicate rolls, unknown students and mismatched names fail', () => {
  assert(validateMonthlyRows([row,row], students,31)[1].errors.some(e=>e.includes('Duplicate')));
  assert(validateMonthlyRows([{...row,roll_number:'missing'}],students,31)[0].errors.some(e=>e.includes('not found')));
  assert(validateMonthlyRows([{...row,student_name:'Another person'}],students,31)[0].errors.some(e=>e.includes('does not match')));
  assert.throws(()=>validateMonthlyRows([],students,31));
  assert.throws(()=>validateMonthlyRows(Array(1001).fill(row),students,31));
});
