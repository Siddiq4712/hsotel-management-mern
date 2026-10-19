import moment from 'moment';

export const ACTIVE_FOOD_ORDER_STATUSES = 'pending,confirmed,preparing,ready,delivered';

export function additionalFoodSummary(orders, { date, meal = 'all' } = {}) {
  const groups = new Map();
  const allStudents = new Set();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const servingDate = moment(order.requested_time).utcOffset(330).format('YYYY-MM-DD');
    if (date && servingDate !== date) continue;
    const student = String(order.student_id ?? order.Student?.userId ?? `order:${order.id}`);
    for (const item of order.FoodOrderItems || []) {
      const food = item.SpecialFoodItem;
      const mealType = item.meal_type_snapshot || food?.meal_type || '';
      if (meal !== 'all' && mealType !== meal) continue;
      const category = ['Veg', 'Non-Veg'].includes(item.category_snapshot) ? item.category_snapshot : food?.category || 'Unspecified';
      const key = JSON.stringify([servingDate, item.food_item_id, mealType, category]);
      if (!groups.has(key)) groups.set(key, { key, serving_date: servingDate, meal_type: mealType, category,
        food: item.food_name_snapshot || food?.name || `Food #${item.food_item_id}`, students: new Set(), student_quantity: 0, staff_quantity: 0, quantity: 0 });
      const group = groups.get(key);
      const quantity = Number(item.quantity);
      group.students.add(student);
      allStudents.add(student);
      group[order.order_source === 'staff' ? 'staff_quantity' : 'student_quantity'] += quantity;
      group.quantity += quantity;
    }
  }
  const rows = [...groups.values()].map(({ students, ...row }) => ({ ...row, student_count: students.size }))
    .sort((a, b) => a.serving_date.localeCompare(b.serving_date) || a.meal_type.localeCompare(b.meal_type) || a.food.localeCompare(b.food));
  return { rows, student_count: allStudents.size, quantity: rows.reduce((sum, row) => sum + row.quantity, 0) };
}
