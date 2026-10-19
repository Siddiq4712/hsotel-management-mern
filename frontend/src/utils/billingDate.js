import moment from 'moment';

export function initialBillingDate() {
  const params = new URLSearchParams(window.location.search);
  const month = Number(params.get('month'));
  const year = Number(params.get('year'));
  if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000 && year <= 2100) {
    return moment({ year, month: month - 1, day: 1 });
  }
  return moment();
}
