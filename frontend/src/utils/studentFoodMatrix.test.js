import { expect, it } from 'vitest';
import { studentFoodMatrix } from './studentFoodMatrix';

it('combines food selections into one student row, fills missing quantities with zero, and preserves room order', () => {
  const row = { student_id: 1, name: 'First', roll_number: 'R1', room_number: '10', food: 'Rice', meal_type: 'Lunch', quantity: 2 };
  const matrix = studentFoodMatrix([row, { ...row, food: 'Curd', quantity: 1 }, { ...row, quantity: 3 },
    { ...row, student_id: 2, name: 'Second', roll_number: 'R2', room_number: '2', quantity: 1 }]);
  expect(matrix.headers).toEqual(['Name', 'Roll No', 'Room No', 'Curd', 'Rice']);
  expect(matrix.values).toEqual([['Second', 'R2', '2', 0, 1], ['First', 'R1', '10', 1, 5]]);
  expect(matrix.rows).toHaveLength(2);
});
it('keeps same-named foods from different meals distinct and students with the same name separate', () => {
  const matrix = studentFoodMatrix([
    { student_id: 1, name: 'Same name', roll_number: 'R1', room_number: '2', food: 'Egg', meal_type: 'Dinner', quantity: 1 },
    { student_id: 1, name: 'Same name', roll_number: 'R1', room_number: '2', food: 'Egg', meal_type: 'Breakfast', quantity: 2 },
    { student_id: 2, name: 'Same name', roll_number: 'R2', room_number: '', food: 'Egg', meal_type: 'Breakfast', quantity: 1 },
  ]);
  expect(matrix.headers).toEqual(['Name', 'Roll No', 'Room No', 'Egg (Breakfast)', 'Egg (Dinner)']);
  expect(matrix.values.map(row => row.slice(3))).toEqual([[2, 1], [1, 0]]);
  expect(matrix.rows).toHaveLength(2);
});
