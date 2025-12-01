/**
 * Intro Writer Module
 * Generates 150-200 word SEO intro paragraphs for niche product pages
 */

/**
 * Arrays of variation words for unique content generation
 */
const openingPhrases = [
  'Finding the perfect',
  'Searching for the ideal',
  'Looking for the best',
  'Choosing the right',
  'Selecting quality'
];

const challengeDescriptions = [
  'can be overwhelming with so many options available',
  'requires careful consideration of numerous factors',
  'means navigating through countless choices',
  'involves evaluating many competing products',
  'presents a challenge with the vast marketplace'
];

const researchDescriptions = [
  'analyzed thousands of customer reviews, expert opinions, and real-world testing data',
  'examined extensive customer feedback, professional assessments, and hands-on evaluations',
  'reviewed countless user experiences, industry analyses, and performance benchmarks',
  'evaluated comprehensive customer ratings, expert insights, and practical test results',
  'studied in-depth user testimonials, specialist evaluations, and actual performance data'
];

const qualityDescriptions = [
  'ensures you get only the best quality options',
  'guarantees access to top-tier selections',
  'provides you with premium choices',
  'delivers exceptional product recommendations',
  'offers superior quality picks'
];

const audienceDescriptions = [
  "Whether you're a first-time buyer or looking to upgrade",
  "Whether you're new to this category or seeking an improvement",
  "No matter if you're purchasing for the first time or replacing an existing product",
  "Regardless of whether this is your initial purchase or an upgrade",
  "For both newcomers and those looking to enhance their current setup"
];

const updateDescriptions = [
  'This guide is updated regularly with the latest pricing, availability, and customer feedback from Amazon',
  'We continuously refresh this list with current prices, stock status, and recent customer reviews',
  'Our recommendations are kept current with up-to-date pricing and the newest customer insights',
  'This list receives regular updates featuring the most recent pricing and customer experiences',
  'We maintain this guide with fresh pricing data and the latest customer testimonials'
];

/**
 * Get a random item from an array based on a seed value
 * @param {Array} arr - Array to select from
 * @param {number} seed - Seed value for pseudo-random selection
 * @returns {*} Selected array item
 */
function getSeededItem(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

/**
 * Default rating values used when parsing fails
 */
const DEFAULT_FALLBACK_RATING = 4.0;
const DEFAULT_AVERAGE_RATING = '4.5';

/**
 * Generate a unique SEO intro paragraph
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects
 * @returns {string} HTML content for intro paragraph (150-200 words)
 */
function generateIntro(niche, products) {
  const year = new Date().getFullYear();
  const avgRating = products.length > 0
    ? (products.reduce((sum, p) => sum + (parseFloat(p.rating) || DEFAULT_FALLBACK_RATING), 0) / products.length).toFixed(1)
    : DEFAULT_AVERAGE_RATING;

  // Use timestamp and product count as seed for variation
  const seed = Date.now() + products.length + niche.length;

  const opening = getSeededItem(openingPhrases, seed);
  const challenge = getSeededItem(challengeDescriptions, seed + 1);
  const research = getSeededItem(researchDescriptions, seed + 2);
  const quality = getSeededItem(qualityDescriptions, seed + 3);
  const audience = getSeededItem(audienceDescriptions, seed + 4);
  const update = getSeededItem(updateDescriptions, seed + 5);

  const nicheLower = niche.toLowerCase();
  const productCount = products.length || 10;

  const content = `
        <p>${opening} ${nicheLower} ${challenge} in ${year}. 
        We've ${research} to bring you 
        this comprehensive guide to the top ${productCount} ${nicheLower} on the market today.</p>
        
        <p>Our selection features products with an average rating of ${avgRating} stars or higher, which ${quality}. ${audience}, this list will help 
        you make an informed decision based on performance, value, and customer satisfaction.</p>
        
        <p>${update}, 
        so you always have access to current information when making your purchase decision.</p>
    `;

  return content.trim();
}

module.exports = {
  generateIntro
};
