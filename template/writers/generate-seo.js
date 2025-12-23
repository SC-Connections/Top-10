/**
 * SEO Content Generator
 * Main orchestrator that combines all writer modules to generate complete SEO content
 */

const { generateIntro } = require('./intro-writer');
const { generateBuyersGuide } = require('./buyers-guide-writer');
const { generateFAQ, generateFAQHtml, generateFAQStructuredData } = require('./faq-writer');
const { generateCTA } = require('./cta-writer');
const { writeBlogContent } = require('./blog-writer');

/**
 * Generate complete SEO content for a niche
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects
 * @returns {Promise<object>} SEO content object with intro, buyersGuide, faqHtml, faqStructuredData, cta
 */
async function generateSEOContent(niche, products) {
  // Generate all SEO content components
  const intro = generateIntro(niche, products);
  const buyersGuide = generateBuyersGuide(niche, products);
  const faqResult = generateFAQ(niche, products);
  const cta = generateCTA(niche);

  return {
    intro,
    buyersGuide,
    faqHtml: faqResult.html,
    faqStructuredData: faqResult.schema,
    cta
  };
}

/**
 * Generate a blog article for a specific product
 * @param {object} product - Product object with details
 * @param {string} niche - The niche category
 * @param {number} rank - Product ranking position (1-10)
 * @returns {Promise<object>} Blog article object with title, content, metaDescription, readingTime
 */
async function generateBlogArticle(product, niche, rank) {
  return writeBlogContent(product, niche, rank);
}

module.exports = {
  generateSEOContent,
  generateBlogArticle,
  // Also export individual functions for backward compatibility
  generateIntro,
  generateBuyersGuide,
  generateFAQ,
  generateFAQHtml,
  generateFAQStructuredData,
  generateCTA,
  writeBlogContent
};
