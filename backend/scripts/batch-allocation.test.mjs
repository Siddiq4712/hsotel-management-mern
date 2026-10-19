import test from 'node:test';
import assert from 'node:assert/strict';
import { matchBatch, validateBatch, normalizeBatchYear } from '../services/batchAllocation.js';
const batches = [{ id: 1, name: '2024-2028', erp_batch_year: 2024, hostel_id: 2, is_active: true }];
test('ERP batch 2024 resolves to 2024-2028 and its hostel', () => {
  assert.equal(matchBatch(2024, batches).name, '2024-2028');
  assert.equal(matchBatch('2024', batches).hostel_id, 2);
});
test('roll prefixes and roll numbers are never accepted as batch years', () => {
  for (const value of ['24', '24104085', null, undefined, '', '2024-2028', '2024junk']) assert.throws(() => matchBatch(value, batches), /valid ERP batch/);
});
test('unconfigured, archived and unassigned years fail explicitly', () => {
  assert.throws(() => matchBatch(2025, batches), /No batch configured/);
  assert.throws(() => matchBatch(2024, [{ ...batches[0], is_active: false }]), /No batch configured/);
  assert.throws(() => matchBatch(2024, [{ ...batches[0], hostel_id: null }]), /Assign a hostel/);
});
test('an admission year cannot be configured twice even for different year ranges', () => {
  assert.throws(() => validateBatch({ start_year: 2024, end_year: 2027, hostel_id: 1 }, batches), /already configured/);
  assert.throws(() => matchBatch(2024, [...batches, { ...batches[0], id: 2, hostel_id: 1 }]), /Ambiguous/);
});
test('one hostel can contain several admission years and editing a batch keeps its year', () => {
  assert.equal(validateBatch({ start_year: 2025, end_year: 2029, hostel_id: 2 }, batches).erp_batch_year, 2025);
  assert.equal(validateBatch({ start_year: 2024, end_year: 2028, hostel_id: 1 }, batches, 1).hostel_id, 1);
});
test('invalid years and conflicting explicit admission years are rejected', () => {
  assert.throws(() => validateBatch({ start_year: 2024, end_year: 2023 }, []), /years/);
  assert.throws(() => validateBatch({ start_year: 2024, end_year: 2028, erp_batch_year: 2025 }, []), /match/);
  assert.equal(normalizeBatchYear(' 2024 '), 2024);
});
