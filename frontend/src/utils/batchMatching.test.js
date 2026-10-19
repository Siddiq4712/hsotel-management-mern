import { expect, it } from 'vitest';
import { studentBatch } from './batchMatching';
it('matches the explicit ERP year and never derives it from roll numbers', () => {
  const batch = { id: 2, name: '2024-2028', erp_batch_year: 2024, hostel_id: 2, is_active: true };
  expect(studentBatch(2024, [batch])).toEqual(batch);
  expect(studentBatch('2024', [batch])).toEqual(batch);
  for (const value of [2023, '24104085', '24', null, '2024-2028']) expect(studentBatch(value, [batch])).toBeNull();
  expect(studentBatch(2024, [{ ...batch, hostel_id: null }])).toBeNull();
});
