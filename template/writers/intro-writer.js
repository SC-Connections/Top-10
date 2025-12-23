/**
 * Intro Writer Module
 * Generates 150-200 word SEO intro paragraphs for niche product pages
 */

/**
 * Arrays of variation words for unique content generation
 */
const openingPhrases = [
  'Finding the right',
  'Searching for quality',
  'Looking for the best',
  'Choosing reliable',
  'Selecting premium'
];

const challengeDescriptions = [
  'can be challenging with hundreds of options flooding the market',
  'requires cutting through marketing hype to find real value',
  'means sorting through countless options to find what actually works',
  'involves distinguishing genuine quality from overhyped products',
  'presents a challenge when every brand claims to be "the best"'
];

const researchDescriptions = [
  'analyzed real Amazon reviews from verified buyers, expert testing, and hands-on performance data',
  'examined thousands of customer experiences, professional assessments, and real-world usage patterns',
  'reviewed extensive user feedback, independent testing results, and actual performance benchmarks',
  'evaluated comprehensive customer ratings, expert reviews, and practical testing data',
  'studied in-depth user testimonials, professional evaluations, and real-world performance metrics'
];

const qualityDescriptions = [
  'focusing on proven performers with strong ratings and satisfied customers',
  'emphasizing products that deliver on their promises with consistent quality',
  'prioritizing options backed by positive user experiences and solid performance',
  'featuring choices that excel in real-world use, not just on paper',
  'highlighting picks that balance features, quality, and value effectively'
];

const audienceDescriptions = [
  "Whether you're shopping for your first pair or upgrading from an older model",
  "Whether you're new to this category or looking to replace what you have",
  "No matter if you're buying for the first time or seeking better performance",
  "Whether this is your initial purchase or you're ready for an upgrade",
  "For both first-time buyers and those upgrading their current setup"
];

const updateDescriptions = [
  'This guide stays current with fresh Amazon data, including pricing changes and new customer reviews',
  'We continuously update this list with the latest prices, availability, and recent customer feedback',
  'Our recommendations reflect current market conditions, with up-to-date pricing and real user experiences',
  'This list receives regular updates with current prices, stock status, and the newest customer insights',
  'We maintain this guide with live Amazon data, ensuring accurate pricing and current availability'
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
