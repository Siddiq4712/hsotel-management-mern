import moment from 'moment';

export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const foodToday = () => moment().utcOffset(330).format('YYYY-MM-DD');
export const foodDeadline = (food, date) => moment.parseZone(`${date}T${food.order_deadline_time || '19:00'}:00+05:30`);
export const foodOrderingClosed = (food, date, now = Date.now()) => moment(now).isSameOrAfter(foodDeadline(food, date));

export function nextFoodDate(day, today = foodToday()) {
  const date = moment(today, 'YYYY-MM-DD', true);
  if (day != null) date.add((Number(day) - date.day() + 7) % 7, 'days');
  return date.format('YYYY-MM-DD');
}

export function additionalFoodRequest(food, quantity, servingDate, today = foodToday(), now = Date.now()) {
  const count = Number(quantity);
  const date = moment(servingDate, 'YYYY-MM-DD', true);
  if (!food || !Number.isInteger(food.id) || food.is_available === false) throw new Error('This food is no longer available.');
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Enter a whole quantity from 1 to 1000.');
  if (count > (food.max_quantity_per_student ?? 1)) throw new Error(`Maximum ${food.max_quantity_per_student ?? 1} per student for this food on one serving date.`);
  if (!date.isValid() || servingDate < today) throw new Error('Select today or a future serving date.');
  if (food.weekly_day != null && Number(food.weekly_day) !== date.day()) throw new Error(`Choose a ${WEEK_DAYS[food.weekly_day]} for this food.`);
  if (foodOrderingClosed(food, servingDate, now)) throw new Error(`Ordering closed at ${foodDeadline(food, servingDate).format('h:mm A')} on ${servingDate} (IST).`);
  return { items: [{ food_item_id: food.id, quantity: count }], serving_date: servingDate };
}
