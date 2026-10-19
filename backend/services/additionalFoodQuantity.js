import { Op } from 'sequelize';
import { FoodOrder, FoodOrderItem } from '../models/index.js';

// The caller holds the hostel billing lock until commit, serializing concurrent
// student requests as well as cancellations that release a quantity allowance.
export async function assertAdditionalFoodQuantity(studentId, hostelId, date, foods, items, transaction) {
  const previous = await FoodOrderItem.findAll({
    where: { food_item_id: { [Op.in]: items.map(item => item.food_item_id) } },
    include: [{ model: FoodOrder, required: true, attributes: [], where: {
      student_id: studentId, hostel_id: hostelId, status: { [Op.ne]: 'cancelled' },
      [Op.or]: [{ order_source: 'student' }, { order_source: null }],
      requested_time: { [Op.between]: [new Date(`${date}T00:00:00+05:30`), new Date(`${date}T23:59:59.999+05:30`)] },
    } }], transaction,
  });
  for (const item of items) {
    const food = foods.find(food => food.id === item.food_item_id);
    const used = previous.filter(row => row.food_item_id === item.food_item_id).reduce((sum, row) => sum + Number(row.quantity), 0);
    const maximum = food.max_quantity_per_student ?? 1;
    if (used + item.quantity > maximum) throw Object.assign(new Error(`${food.name}: maximum ${maximum} per student for ${date}. Already ordered: ${used}. You can add ${Math.max(0, maximum - used)} more.`), { status: 400 });
  }
}
