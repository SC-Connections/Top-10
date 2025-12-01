/**
 * Shared Utilities for Writer Modules
 * Common functions used across multiple writer modules
 */

/**
 * Default values for calculations
 */
const DEFAULT_AVG_PRICE = 100;

/**
 * Calculate average price from products array
 * @param {Array} products - Array of product objects
 * @returns {number} Average price rounded to nearest integer
 */
function calculateAveragePrice(products) {
  if (!products || products.length === 0) {
    return DEFAULT_AVG_PRICE;
  }

  const prices = products
    .map(p => parseFloat((p.price || '').replace(/[^0-9.]/g, '')))
    .filter(p => !isNaN(p) && p > 0);

  if (prices.length === 0) {
    return DEFAULT_AVG_PRICE;
  }

  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

/**
 * Get top brand name from products
 * @param {Array} products - Array of product objects
 * @returns {string} Top brand name or 'leading'
 */
function getTopBrand(products) {
  if (products && products.length > 0 && products[0].title) {
    return products[0].title.split(' ')[0];
  }
  return 'leading';
}

module.exports = {
  calculateAveragePrice,
  getTopBrand,
  DEFAULT_AVG_PRICE
};
