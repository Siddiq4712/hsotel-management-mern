import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStudentDob, passwordFromDob, readStudentDob } from '../../shared/studentDob.js';

test('DOB passwords use eight digits in DDMMYYYY order', () => {
  for (const value of ['2006-08-15', '15/08/2006', '15-08-2006', '15082006', '2006-08-15T00:00:00.000Z']) {
    assert.equal(passwordFromDob(value), '15082006');
  }
  assert.equal(passwordFromDob('2006-02-01'), '01022006');
  assert.equal(passwordFromDob(1022006), '01022006');
  assert.equal(passwordFromDob(new Date('2006-02-01T00:00:00Z')), '01022006');
});
test('rejects missing, invalid and future birth dates', () => {
  for (const value of [null, '', undefined, '31/02/2006', '2006-13-01', '00/01/2006', '29/02/2006', '2099-01-01', '15/08/06']) {
    assert.throws(() => passwordFromDob(value));
  }
  assert.equal(normalizeStudentDob('29/02/2004'), '2004-02-29');
});
test('reads API DOB aliases and normalized ERP raw records', () => {
  assert.equal(readStudentDob({ dob: '15/08/2006' }), '15/08/2006');
  assert.equal(readStudentDob({ dateOfBirth: '2006-08-15' }), '2006-08-15');
  assert.equal(readStudentDob({ date_of_birth: '', raw: { DOB: '01022006' } }), '01022006');
  assert.equal(readStudentDob({}), '');
});
