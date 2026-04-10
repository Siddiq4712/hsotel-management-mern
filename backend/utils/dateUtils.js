import moment from 'moment';

export const getTimeZoneDateString = (
  timeZone = process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Kolkata'
) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

export const getMonthDateRange = (month, year) => {
  const startDate = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
  const endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
  return { startDate, endDate };
};
