import { expect, it } from 'vitest';
import { studentBatch } from './batchMatching';
it('matches the explicit ERP year and never derives it from roll numbers', () => {
  const batch = { id: 2, name: '2024-2028', erp_batch_year: 2024, gender: 'male', hostel_id: 2, is_active: true };
  expect(studentBatch(2024, [batch], 'male')).toEqual(batch);
  expect(studentBatch('2024', [batch], 'M')).toEqual(batch);
  for (const value of [2023, '24104085', '24', null, '2024-2028']) expect(studentBatch(value, [batch], 'male')).toBeNull();
  expect(studentBatch(2024, [{ ...batch, hostel_id: null }], 'male')).toBeNull();
});

it('requires both gender and year and routes female students separately', () => {
  const male = { id: 1, gender: 'male', erp_batch_year: 2024, hostel_id: 1, is_active: true };
  const female = { ...male, id: 2, gender: 'female', hostel_id: 2 };
  expect(studentBatch(2024, [male, female], 'F')).toEqual(female);
  expect(studentBatch(2024, [male, female], 'Male')).toEqual(male);
  expect(studentBatch(2024, [male], 'female')).toBeNull();
  expect(studentBatch(2024, [male])).toBeNull();
});
