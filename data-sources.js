/**
 * Data Sources - Intelligent Data Layer
 * Gathers top products from multiple sources with premium brand filtering
 */

const { scrapeGoogleTrends } = require('./google-trends');
const { scrapeAmazonBestSellers } = require('./amazon-scraper');
const { rapidApiFallback } = require('./api-fallback');

const PREMIUM_BRANDS = [
  "Apple", "Sony", "Bose", "Sennheiser", "Bang & Olufsen",
  "Shure", "Razer", "Logitech", "Samsung", "JBL", "Beats"
];

/**
 * Gather top products from multiple data sources
 * Priority: Google Trends -> Amazon Best Sellers -> RapidAPI Fallback if < 10 products
 * @param {string} niche - Niche name to search for
 * @returns {Promise<Array>} Products array (will be filtered to exactly 10 by applyFilters)
 */
async function gatherTopProducts(niche) {
  let products = [];

  // 1. Try Google Trends
  try {
    console.log('🔍 Scraping Google Trends...');
    const trendsProducts = await scrapeGoogleTrends(niche);
    products.push(...trendsProducts);
    console.log(`✓ Google Trends: ${trendsProducts.length} products`);
  } catch (e) {
    console.log("Google Trends failed:", e.message);
  }

  // 2. Try Amazon Best Sellers
  try {
    console.log('🔍 Scraping Amazon Best Sellers...');
    const amazonProducts = await scrapeAmazonBestSellers(niche);
    products.push(...amazonProducts);
    console.log(`✓ Amazon Best Sellers: ${amazonProducts.length} products`);
  } catch (e) {
    console.log("Amazon Best Sellers failed:", e.message);
  }

  // 3. Don't pre-filter for premium brands - let applyFilters handle it
  // This ensures we have enough products to work with
  console.log(`✓ Gathered products before fallback: ${products.length}`);

  // 4. If fewer than 10 results, aggressively use RapidAPI fallback with pagination
  if (products.length < 10) {
    console.log(`⚠️  Only ${products.length} products gathered, using RapidAPI fallback to get more...`);
    const backup = await rapidApiFallback(niche);
    console.log(`✓ RapidAPI Fallback: ${backup.length} products`);
    products.push(...backup);
    console.log(`✓ Total after fallback: ${products.length} products`);
  }

  // 5. Return products (will be filtered and deduplicated by applyFilters in site-generator)
  return products;
}

module.exports = { gatherTopProducts };
