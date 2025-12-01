/**
 * CTA Writer Module
 * Generates call-to-action content encouraging users to check prices on Amazon
 */

/**
 * CTA phrase variations for unique content
 */
const ctaHeadings = [
  'Ready to Choose Your Perfect',
  'Find Your Ideal',
  'Discover the Best',
  'Make Your Selection:',
  'Time to Pick Your'
];

const ctaIntros = [
  "We've done the research, compared the options, and presented the top",
  'Our team has thoroughly analyzed, compared, and curated the best',
  'After extensive research and comparison, we bring you the finest',
  "We've evaluated numerous options to bring you this curated selection of the top",
  'Our comprehensive analysis has identified the leading'
];

const ctaActions = [
  'Click any "View on Amazon" button above to check current prices, read more customer reviews, and make your purchase with confidence.',
  'Select any product above to view the latest pricing, explore detailed customer reviews, and complete your purchase securely.',
  'Browse our selections above and click through to Amazon for current pricing, authentic reviews, and easy purchasing.',
  'Explore our recommendations and visit Amazon for real-time pricing, verified reviews, and secure checkout.',
  'Check out any product listing above to see live prices, customer feedback, and convenient purchasing options.'
];

const ctaClosings = [
  'Our recommendations are updated regularly to ensure you always have access to the latest information.',
  'We keep this list current so you always have the most accurate and up-to-date recommendations.',
  'This guide is refreshed frequently to provide you with the newest pricing and product information.',
  'We continuously update our selections to reflect the latest market offerings and customer feedback.',
  'Our team regularly reviews and updates these recommendations based on new data and customer experiences.'
];

/**
 * Get a seeded random item from an array
 * @param {Array} arr - Array to select from
 * @param {number} seed - Seed value
 * @returns {*} Selected item
 */
function getSeededItem(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

/**
 * Generate CTA (Call to Action) content
 * @param {string} niche - The niche category
 * @returns {string} HTML content for CTA section
 */
function generateCTA(niche) {
  // Use timestamp and niche length as seed for variation
  const seed = Date.now() + niche.length;

  const heading = getSeededItem(ctaHeadings, seed);
  const intro = getSeededItem(ctaIntros, seed + 1);
  const action = getSeededItem(ctaActions, seed + 2);
  const closing = getSeededItem(ctaClosings, seed + 3);

  const nicheLower = niche.toLowerCase();

  const content = `
        <h2>${heading} ${niche}?</h2>
        <p>${intro} ${nicheLower} 
        available today. Each product in our list offers excellent value, quality, and customer satisfaction based on real user experiences and expert analysis.</p>
        <p>${action}</p>
        <p>${closing}</p>
        <p><strong>Shop with confidence on Amazon</strong> - enjoy secure checkout, reliable delivery, and hassle-free returns on your ${nicheLower} purchase.</p>
    `;

  return content.trim();
}

module.exports = {
  generateCTA
};
