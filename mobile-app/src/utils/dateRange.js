import moment from 'moment';

export const dateKey = value => value && moment(value).isValid() ? moment(value).format('YYYY-MM-DD') : '';
export const inclusiveDays = (from, to) => {
  const start = dateKey(from), end = dateKey(to);
  return start && end && end >= start ? moment(end).diff(moment(start), 'days') + 1 : 0;
};
export const selectRangeDay = (range, day) => {
  if (!range.from || range.to || day < range.from) return { from: day, to: '' };
  return { from: range.from, to: day };
};
export function monthDays(month) {
  const start = moment(month).startOf('month');
  return Array.from({ length: 42 }, (_, index) => {
    const day = start.clone().add(index - start.day(), 'days');
    return { key: day.format('YYYY-MM-DD'), day: day.date(), inMonth: day.month() === start.month() };
  });
}
