import { expect, it } from 'vitest';
import { additionalFoodSummary } from './additionalFoodSummary';

const order = (id, student, source, quantity, overrides = {}) => ({
  id, student_id: student, order_source: source, status: 'confirmed', requested_time: '2026-10-24T23:30:00Z',
  FoodOrderItems: [{ food_item_id: 1, quantity, food_name_snapshot: 'Egg', category_snapshot: 'Non-Veg', meal_type_snapshot: 'Breakfast' }],
  ...overrides,
});

it('includes both sources and legacy orders, counts each student once per food, and excludes cancellations', () => {
  const summary = additionalFoodSummary([
    order(1, 10, 'student', 2, { status: 'pending' }), order(2, 10, 'staff', 3),
    order(3, 20, 'staff', 1, { status: 'delivered' }), order(4, 30, null, 2),
    order(5, 40, 'student', 99, { status: 'cancelled' }),
  ]);
  expect(summary).toMatchObject({ student_count: 3, quantity: 8 });
  expect(summary.rows).toHaveLength(1);
  expect(summary.rows[0]).toMatchObject({ serving_date: '2026-10-25', food: 'Egg', student_count: 3, student_quantity: 4, staff_quantity: 4, quantity: 8 });
});

it('keeps serving dates and meals separate, and filters by the IST serving date and meal', () => {
  const breakfast = order(1, 10, 'student', 2);
  const dinner = order(2, 10, 'staff', 3, { FoodOrderItems: [{ ...breakfast.FoodOrderItems[0], meal_type_snapshot: 'Dinner', quantity: 3 }] });
  const nextDay = order(3, 20, 'student', 1, { requested_time: '2026-10-26T04:00:00Z' });
  expect(additionalFoodSummary([breakfast, dinner, nextDay]).rows).toHaveLength(3);
  const filtered = additionalFoodSummary([breakfast, dinner, nextDay], { date: '2026-10-25', meal: 'Dinner' });
  expect(filtered).toMatchObject({ student_count: 1, quantity: 3 });
  expect(filtered.rows).toHaveLength(1);
  expect(filtered.rows[0].meal_type).toBe('Dinner');
});
