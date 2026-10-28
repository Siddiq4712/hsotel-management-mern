import test from 'node:test';
import assert from 'node:assert/strict';
import { matchBatch, validateBatch, normalizeBatchYear } from '../services/batchAllocation.js';
import { assertAdmissionSource, normalizeCollege } from '../../shared/colleges.js';
const batches = [{ id: 1, name: '2024-2028', erp_batch_year: 2024, gender: 'male', hostel_id: 2, is_active: true }];
test('ERP batch 2024 resolves to 2024-2028 and its hostel', () => {
  assert.equal(matchBatch(2024, batches, 'male').name, '2024-2028');
  assert.equal(matchBatch('2024', batches, 'M').hostel_id, 2);
});
test('roll prefixes and roll numbers are never accepted as batch years', () => {
  for (const value of ['24', '24104085', null, undefined, '', '2024-2028', '2024junk']) assert.throws(() => matchBatch(value, batches, 'male'), /valid ERP batch/);
});
test('unconfigured, archived and unassigned years fail explicitly', () => {
  assert.throws(() => matchBatch(2025, batches, 'male'), /No batch configured/);
  assert.throws(() => matchBatch(2024, [{ ...batches[0], is_active: false }], 'male'), /No batch configured/);
  assert.throws(() => matchBatch(2024, [{ ...batches[0], hostel_id: null }], 'male'), /Assign a hostel/);
});
test('an admission year cannot be configured twice even for different year ranges', () => {
  assert.throws(() => validateBatch({ gender: 'male', start_year: 2024, end_year: 2027, hostel_id: 1 }, batches), /already configured/);
  assert.throws(() => matchBatch(2024, [...batches, { ...batches[0], id: 2, hostel_id: 1 }], 'male'), /Ambiguous/);
});
test('one hostel can contain several admission years and editing a batch keeps its year', () => {
  assert.equal(validateBatch({ gender: 'male', start_year: 2025, end_year: 2029, hostel_id: 2 }, batches).erp_batch_year, 2025);
  assert.equal(validateBatch({ gender: 'male', start_year: 2024, end_year: 2028, hostel_id: 1 }, batches, 1).hostel_id, 1);
});
test('invalid years and conflicting explicit admission years are rejected', () => {
  assert.throws(() => validateBatch({ gender: 'male', start_year: 2024, end_year: 2023 }, []), /years/);
  assert.throws(() => validateBatch({ gender: 'male', start_year: 2024, end_year: 2028, erp_batch_year: 2025 }, []), /match/);
  assert.equal(normalizeBatchYear(' 2024 '), 2024);
});

test('same admission year can route male and female students to separate hostels', () => {
  const female = validateBatch({ start_year: 2024, end_year: 2028, gender: 'Female', hostel_id: 3 }, batches);
  const mixed = [...batches, { ...female, id: 2 }];
  assert.equal(matchBatch(2024, mixed, 'F').hostel_id, 3);
  assert.equal(matchBatch(2024, mixed, 'MALE').hostel_id, 2);
  assert.throws(() => matchBatch(2024, batches, 'female'), /No batch configured/);
});
test('missing and unknown genders never match or create a batch', () => {
  for (const gender of [null, undefined, '', 'N/A', 'male-other']) {
    assert.throws(() => matchBatch(2024, batches, gender), /gender/);
    assert.throws(() => validateBatch({ start_year: 2024, end_year: 2028, gender }, []), /gender/);
  }
  assert.throws(() => matchBatch(2024, [{ ...batches[0], gender: null }], 'male'), /No batch configured/);
});

test('NEC and LAPC with the same year and gender resolve to their own hostels', () => {
  const lapc = { ...validateBatch({ start_year: 2024, end_year: 2027, college: 'LAPC', gender: 'male', hostel_id: 8 }, batches), id: 3 };
  const configured = [...batches, lapc];
  assert.equal(matchBatch(2024, configured, 'male', 'lapc').hostel_id, 8);
  assert.equal(matchBatch(2024, configured, 'male', 'NEC').hostel_id, 2);
  assert.throws(() => matchBatch(2024, batches, 'male', 'lapc'), /No batch configured for LAPC/);
  assert.throws(() => validateBatch({ start_year: 2024, end_year: 2027, college: 'lapc', gender: 'male', hostel_id: 8 }, configured), /already configured/);
  assert.throws(() => matchBatch(2024, configured, 'male', 'unknown'), /valid college/);
  assert.throws(() => validateBatch({ start_year: 2024, end_year: 2028, college: 'unknown', gender: 'male' }, []), /valid college/);
});

test('LAPC is Excel-only, while NEC and legacy empty college records keep working', () => {
  assert.equal(assertAdmissionSource(' LAPC ', 'excel'), 'lapc');
  for (const source of ['api', 'manual', undefined]) assert.throws(() => assertAdmissionSource('lapc', source), /Excel/);
  assert.equal(assertAdmissionSource('nec', 'api'), 'nec');
  assert.equal(normalizeCollege(null), 'nec');
  assert.throws(() => normalizeCollege(''), /valid college/);
});
