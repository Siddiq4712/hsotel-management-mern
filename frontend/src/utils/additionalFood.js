import moment from 'moment';

export const additionalFoodDeadline = (food, date) => moment.parseZone(`${date}T${food.order_deadline_time || '19:00'}:00+05:30`);
export const additionalFoodClosed = (food, date, now = Date.now()) => moment(now).isSameOrAfter(additionalFoodDeadline(food, date));
