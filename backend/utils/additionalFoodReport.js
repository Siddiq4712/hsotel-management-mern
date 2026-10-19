const roomSort = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
export function buildAdditionalFoodReport(orders, rooms, enrollments, date, meal = 'all') {
  const grouped = new Map();
  const legacyOrders = new Set();
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const person = order.Student;
    const room = rooms.find(row => row.student_id === order.student_id)?.HostelRoom?.room_number || '';
    const roll = person?.roll_number || enrollments.find(row => row.student_id === order.student_id)?.roll_number || '';
    for (const item of order.FoodOrderItems || []) {
      const food = item.SpecialFoodItem;
      const category = ['Veg', 'Non-Veg'].includes(item.category_snapshot) ? item.category_snapshot : food?.category || 'Unspecified';
      const mealType = item.meal_type_snapshot || food?.meal_type || '';
      if (meal !== 'all' && mealType !== meal) continue;
      if (!order.order_source) legacyOrders.add(order.id);
      const foodName = item.food_name_snapshot || food?.name || `Food #${item.food_item_id}`;
      const key = `${order.student_id}:${item.food_item_id}:${category}:${mealType}`;
      if (!grouped.has(key)) grouped.set(key, { key, student_id: order.student_id, name: person?.userName || `Student #${order.student_id}`,
        roll_number: roll, room_number: room, food: foodName, quantity: 0, category, meal_type: mealType });
      grouped.get(key).quantity += Number(item.quantity);
    }
  }
  const sorted = [...grouped.values()].sort((a, b) => Number(!a.room_number) - Number(!b.room_number)
    || roomSort.compare(a.room_number, b.room_number) || roomSort.compare(a.roll_number, b.roll_number) || roomSort.compare(a.food, b.food));
  return { date, meal_type: meal, veg: sorted.filter(row => row.category === 'Veg'), nonVeg: sorted.filter(row => row.category === 'Non-Veg'),
    unclassified: sorted.filter(row => !['Veg', 'Non-Veg'].includes(row.category)), legacy_order_count: legacyOrders.size,
    total_students: new Set(sorted.map(row => row.student_id)).size, total_quantity: sorted.reduce((sum, row) => sum + row.quantity, 0) };
}
