// mobile-app/src/utils/dateUtils.js
import moment from 'moment';

/**
 * Get the first and last day of a month
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2023)
 * @returns {Object} Object with startDate and endDate
 */
export const getMonthDateRange = (month, year) => {
  const startDate = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
  const endDate = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
  return { startDate, endDate };
};

/**
 * Get an array of dates between two dates
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Array} Array of dates in YYYY-MM-DD format
 */
export const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  let currentDate = moment(startDate);
  const lastDate = moment(endDate);
  
  while (currentDate.isSameOrBefore(lastDate)) {
    dates.push(currentDate.format('YYYY-MM-DD'));
    currentDate = currentDate.add(1, 'days');
  }
  
  return dates;
};

/**
 * Format date for display
 * @param {string} date - Date string
 * @param {string} format - Desired format (default: 'YYYY-MM-DD')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  return moment(date).format(format);
};

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date
 */
export const getCurrentDate = () => {
  return moment().format('YYYY-MM-DD');
};

/**
 * Check if a date is in the past
 * @param {string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
  return moment(date).isBefore(moment(), 'day');
};

/**
 * Get the name of a month
 * @param {number} month - Month number (1-12)
 * @returns {string} Month name
 */
export const getMonthName = (month) => {
  return moment().month(month - 1).format('MMMM');
};
