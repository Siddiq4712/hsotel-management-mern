// utils/calculationUtils.js

/**
 * Calculate the total cost from an array of items
 * @param {Array} items - Array of items with quantity and unit_price properties
 * @returns {number} Total cost
 */
const calculateTotalCost = (items) => {
  if (!items || !Array.isArray(items)) return 0;
  
  return items.reduce((total, item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    return total + (quantity * unitPrice);
  }, 0);
};

/**
 * Calculate per person cost
 * @param {number} totalCost - Total cost
 * @param {number} numberOfPeople - Number of people
 * @returns {number} Per person cost
 */
const calculatePerPersonCost = (totalCost, numberOfPeople) => {
  if (!numberOfPeople || numberOfPeople <= 0) return 0;
  return totalCost / numberOfPeople;
};

/**
 * Round to two decimal places
 * @param {number} value - Value to round
 * @returns {number} Rounded value
 */
const roundToTwoDecimal = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {number} Percentage
 */
const calculatePercentage = (part, total) => {
  if (!total || total <= 0) return 0;
  return (part / total) * 100;
};

/**
 * Calculate if stock is low
 * @param {number} currentStock - Current stock level
 * @param {number} minimumStock - Minimum required stock level
 * @returns {boolean} True if stock is low
 */
const isStockLow = (currentStock, minimumStock) => {
  return currentStock <= minimumStock;
};

/**
 * Calculate remaining stock percentage
 * @param {number} currentStock - Current stock level
 * @param {number} initialStock - Initial stock level
 * @returns {number} Percentage of stock remaining
 */
const stockPercentageRemaining = (currentStock, initialStock) => {
  if (!initialStock || initialStock <= 0) return 0;
  return (currentStock / initialStock) * 100;
};

/**
 * Calculate daily average consumption
 * @param {number} totalConsumption - Total consumption
 * @param {number} days - Number of days
 * @returns {number} Daily average consumption
 */
const calculateDailyAverage = (totalConsumption, days) => {
  if (!days || days <= 0) return 0;
  return totalConsumption / days;
};

module.exports = {
  calculateTotalCost,
  calculatePerPersonCost,
  roundToTwoDecimal,
  calculatePercentage,
  isStockLow,
  stockPercentageRemaining,
  calculateDailyAverage
};
