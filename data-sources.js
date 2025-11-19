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
 * Priority: Google Trends -> Amazon Best Sellers -> Premium Filter -> RapidAPI Fallback
 * @param {string} niche - Niche name to search for
 * @returns {Promise<Array>} Top 10 premium products
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

  // 3. Filter for premium brands
  let premium = products.filter(p =>
    PREMIUM_BRANDS.some(b => p.title?.toLowerCase().includes(b.toLowerCase()))
  );
  
  console.log(`✓ Premium products after filtering: ${premium.length}`);

  // 4. If fewer than 8 results, use RapidAPI fallback
  if (premium.length < 8) {
    console.log('⚠️  Less than 8 premium products, using RapidAPI fallback...');
    const backup = await rapidApiFallback(niche);
    console.log(`✓ RapidAPI Fallback: ${backup.length} products`);
    premium.push(...backup);
  }

  // 5. Return only top 10 products
  return premium.slice(0, 10);
}

module.exports = { gatherTopProducts };
