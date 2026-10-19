import test from 'node:test';
import assert from 'node:assert/strict';
import { matchBatch, validateBatch } from '../services/batchAllocation.js';
const batches = [{ id: 1, name: '2024-2028', roll_prefix: '24', hostel_id: 2, is_active: true }];
test('24104085 matches the configured 2024-2028 batch and its hostel', () => {
  assert.equal(matchBatch(' 24104085 ', batches).name, '2024-2028');
  assert.equal(matchBatch('24104085', batches).hostel_id, 2);
});
test('unmatched, archived and unassigned batches fail explicitly', () => {
  assert.throws(() => matchBatch('25104085', batches), /No batch configured/);
  assert.throws(() => matchBatch('24104085', [{ ...batches[0], is_active: false }]), /No batch configured/);
  assert.throws(() => matchBatch('24104085', [{ ...batches[0], hostel_id: null }]), /Assign a hostel/);
});
test('ambiguous prefixes cannot silently pick a hostel', () => {
  assert.throws(() => matchBatch('24104085', [...batches, { ...batches[0], id: 2, roll_prefix: '241', hostel_id: 1 }]), /Ambiguous/);
});
test('new batches reject duplicate or overlapping prefixes and duplicate year ranges', () => {
  for (const roll_prefix of ['24', '2', '241']) assert.throws(() => validateBatch({ start_year: 2025, end_year: 2029, roll_prefix, hostel_id: 1 }, batches), /overlaps/);
  assert.throws(() => validateBatch({ start_year: 2024, end_year: 2028, roll_prefix: '99', hostel_id: 1 }, batches), /already exists/);
});
test('a hostel can have several batches; a batch stores one hostel', () => {
  const second = validateBatch({ start_year: 2025, end_year: 2029, roll_prefix: '25', hostel_id: 2 }, batches);
  assert.equal(second.hostel_id, batches[0].hostel_id);
  assert.equal(second.name, '2025-2029');
  assert.equal(validateBatch({ start_year: 2024, end_year: 2028, roll_prefix: '24', hostel_id: 1 }, batches, 1).hostel_id, 1);
});
test('invalid years and nonnumeric prefixes are rejected', () => {
  assert.throws(() => validateBatch({ start_year: 2024, end_year: 2023, roll_prefix: '24' }, []), /years/);
  assert.throws(() => validateBatch({ start_year: 2024, end_year: 2028, roll_prefix: 'x' }, []), /digits/);
});
