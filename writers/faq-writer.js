/**
 * FAQ Writer Module
 * Generates 5 FAQ pairs (questions + answers) with HTML and JSON-LD schema
 */

const { calculateAveragePrice, getTopBrand } = require('./utils');

/**
 * Generate FAQ questions and answers based on niche and products
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects (optional)
 * @returns {Array} Array of FAQ objects with question and answer
 */
function generateFAQPairs(niche, products = []) {
  const year = new Date().getFullYear();
  const nicheLower = niche.toLowerCase();

  // Calculate average price from products if available
  const avgPrice = calculateAveragePrice(products);

  // Get top brand from products
  const topBrand = getTopBrand(products);

  return [
    {
      question: `What are the best ${nicheLower} in ${year}?`,
      answer: `Based on our comprehensive analysis of customer reviews, expert testing, and real-world performance, the top ${nicheLower} include options from ${topBrand} and other leading brands. Our top 10 list features products that excel in quality, performance, and value. Each product has been selected based on ratings of 4 stars or higher and positive customer feedback from verified purchasers.`
    },
    {
      question: `How much should I spend on ${nicheLower}?`,
      answer: `The price range for quality ${nicheLower} varies significantly based on features and brand. Budget options start around $30-50 and can provide good basic functionality. Mid-range products ($50-150) offer the best balance of features and value for most users. Premium options ($150+) deliver top-tier performance and advanced features. The average price in our top 10 list is approximately $${avgPrice}, which represents excellent value for quality products.`
    },
    {
      question: `Are expensive ${nicheLower} worth the investment?`,
      answer: `Higher-priced ${nicheLower} often offer better build quality, advanced features, superior performance, and longer lifespan. However, the "worth" depends on your specific needs and usage patterns. Casual users may find mid-range options perfectly adequate, while professionals or enthusiasts might benefit significantly from premium features. Consider your budget and requirements carefully when making your decision.`
    },
    {
      question: `How often should I replace my ${nicheLower}?`,
      answer: `The lifespan of ${nicheLower} varies based on quality, usage frequency, and care. Quality products typically last 2-5 years with regular use. Signs you may need a replacement include decreased performance, physical damage, outdated features, or compatibility issues with newer devices. Regular maintenance and proper care can extend the useful life of your ${nicheLower}.`
    },
    {
      question: `What features should I prioritize when buying ${nicheLower}?`,
      answer: `Key factors to prioritize include quality and durability, customer reviews and ratings, brand reputation, price-to-value ratio, warranty coverage, and specific features that match your needs. Our buyer's guide provides detailed information on each important consideration. Always read customer reviews to understand real-world performance and potential issues before making your final purchase decision.`
    }
  ];
}

/**
 * Generate HTML content for FAQ section
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects (optional)
 * @returns {string} HTML content for FAQ section
 */
function generateFAQHtml(niche, products = []) {
  const faqs = generateFAQPairs(niche, products);

  const faqHTML = faqs.map(faq => `
        <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
            <h3 class="faq-question" itemprop="name">${faq.question}</h3>
            <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <p itemprop="text">${faq.answer}</p>
            </div>
        </div>
    `).join('\n');

  return faqHTML;
}

/**
 * Generate JSON-LD structured data for FAQ schema
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects (optional)
 * @returns {object} FAQ structured data object for JSON-LD
 */
function generateFAQStructuredData(niche, products = []) {
  const faqs = generateFAQPairs(niche, products);

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
}

/**
 * Generate complete FAQ content with both HTML and structured data
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects (optional)
 * @returns {object} Object containing faqHtml and faqStructuredData
 */
function generateFAQ(niche, products = []) {
  return {
    html: generateFAQHtml(niche, products),
    schema: generateFAQStructuredData(niche, products)
  };
}

module.exports = {
  generateFAQ,
  generateFAQHtml,
  generateFAQStructuredData
};
