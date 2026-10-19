import { expect, it } from 'vitest';
import { studentBatch } from './batchMatching';
it('derives batch and hostel from roll prefix rather than imported batch IDs', () => {
  const batch = { id: 2, name: '2024-2028', roll_prefix: '24', hostel_id: 2, is_active: true };
  expect(studentBatch('24104085', [batch])).toEqual(batch);
  expect(studentBatch('25104085', [batch])).toBeNull();
  expect(studentBatch('24104085', [{ ...batch, hostel_id: null }])).toBeNull();
  expect(studentBatch('24104085', [{ ...batch, is_active: false }])).toBeNull();
});
