import moment from 'moment';

export const FOOD_CATEGORIES = ['Veg', 'Non-Veg'];
export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
export const indiaToday = () => moment().utcOffset(330).format('YYYY-MM-DD');
export function normalizeFoodDeadline(value = '19:00') {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value) || value > '19:00') throw new Error('Select an ordering deadline no later than 7:00 PM.');
  return value;
}
export const foodDeadline = (food, date) => moment.parseZone(`${date}T${normalizeFoodDeadline(food.order_deadline_time ?? '19:00')}:00+05:30`);

export function normalizeAdditionalFood(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = FOOD_CATEGORIES.find(value => value.toLowerCase() === String(body.category).trim().toLowerCase());
  const mealType = MEAL_TYPES.find(value => value.toLowerCase() === String(body.meal_type).trim().toLowerCase());
  const price = Number(body.price);
  const weeklyDay = Number(body.weekly_day);
  const maxQuantity = Number(body.max_quantity_per_student ?? 1);
  if (!name || name.length > 255) throw new Error('Enter a food name of up to 255 characters.');
  if (body.price === null || body.price === '' || !Number.isFinite(price) || price < 0 || price > 99999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > 0.00001) {
    throw new Error('Enter a valid price with up to two decimal places.');
  }
  if (!category) throw new Error('Select Veg or Non-Veg as the food category.');
  if (!mealType) throw new Error('Select Breakfast, Lunch, or Dinner as the meal.');
  if (!Number.isInteger(maxQuantity) || maxQuantity < 1 || maxQuantity > 1000) throw new Error('Set a whole maximum quantity from 1 to 1000 per student.');
  if (body.weekly_day === null || body.weekly_day === '' || !Number.isInteger(weeklyDay) || weeklyDay < 0 || weeklyDay > 6) {
    throw new Error('Select a weekly day from Sunday to Saturday.');
  }
  if (body.is_available !== undefined && typeof body.is_available !== 'boolean') throw new Error('Visibility must be true or false.');
  return { name, price, category, meal_type: mealType, max_quantity_per_student: maxQuantity, weekly_day: weeklyDay, order_deadline_time: normalizeFoodDeadline(body.order_deadline_time), expiry_time: null, is_available: body.is_available ?? true };
}

export function validateAdditionalFoodOrder(items, foods, servingDate, today = indiaToday(), now = moment()) {
  const date = moment(servingDate, 'YYYY-MM-DD', true);
  if (!date.isValid() || servingDate < today) throw new Error('Select today or a future serving date.');
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('Select between 1 and 100 food items.');
  const seen = new Set();
  for (const item of items) {
    if (!item || !Number.isInteger(item.food_item_id) || item.food_item_id <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000 || seen.has(item.food_item_id)) {
      throw new Error('Select each food once with a whole quantity between 1 and 1000.');
    }
    seen.add(item.food_item_id);
    if (foods === null) continue;
    const food = foods.find(food => food.id === item.food_item_id);
    if (!food || !food.is_available || (food.expiry_time && moment(food.expiry_time).isSameOrBefore(moment()))) throw new Error('A selected food is no longer available.');
    if (item.quantity > (food.max_quantity_per_student ?? 1)) throw new Error(`Maximum ${food.max_quantity_per_student ?? 1} of ${food.name} per student per serving date.`);
    if (food.weekly_day != null && Number(food.weekly_day) !== date.day()) throw new Error(`${food.name} is not scheduled for the selected day.`);
    if (moment(now).isSameOrAfter(foodDeadline(food, servingDate))) throw new Error(`Ordering for ${food.name} closed at ${foodDeadline(food, servingDate).format('h:mm A')} on ${servingDate} (IST).`);
    if (!Number.isFinite(Number(food.price)) || Number(food.price) < 0) throw new Error('A selected food has an invalid price.');
  }
  if (foods !== null) {
    const cents = items.reduce((sum, item) => sum + Math.round(Number(foods.find(food => food.id === item.food_item_id).price) * 100) * item.quantity, 0);
    if (!Number.isSafeInteger(cents) || cents > 9999999999) throw new Error('The food amount is too large.');
  }
}
