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
  const diagnostics = {
    googleTrendsCount: 0,
    amazonBestSellersCount: 0,
    rapidApiCount: 0,
    googleTrendsError: null,
    amazonBestSellersError: null,
    rapidApiError: null
  };

  // 1. Try Google Trends
  try {
    console.log('🔍 Scraping Google Trends...');
    const trendsProducts = await scrapeGoogleTrends(niche);
    products.push(...trendsProducts);
    diagnostics.googleTrendsCount = trendsProducts.length;
    console.log(`✓ Google Trends: ${trendsProducts.length} products`);
  } catch (e) {
    diagnostics.googleTrendsError = e.message;
    console.log("Google Trends failed:", e.message);
  }

  // 2. Try Amazon Best Sellers
  try {
    console.log('🔍 Scraping Amazon Best Sellers...');
    const amazonProducts = await scrapeAmazonBestSellers(niche);
    products.push(...amazonProducts);
    diagnostics.amazonBestSellersCount = amazonProducts.length;
    console.log(`✓ Amazon Best Sellers: ${amazonProducts.length} products`);
  } catch (e) {
    diagnostics.amazonBestSellersError = e.message;
    console.log("Amazon Best Sellers failed:", e.message);
  }

  // 3. Don't pre-filter for premium brands - let applyFilters handle it
  // This ensures we have enough products to work with
  console.log(`✓ Gathered products before fallback: ${products.length}`);

  // 4. If fewer than 10 results, aggressively use RapidAPI fallback with pagination
  if (products.length < 10) {
    console.log(`⚠️  Only ${products.length} products gathered, using RapidAPI fallback to get more...`);
    try {
      const backup = await rapidApiFallback(niche);
      diagnostics.rapidApiCount = backup.length;
      console.log(`✓ RapidAPI Fallback: ${backup.length} products`);
      products.push(...backup);
      console.log(`✓ Total after fallback: ${products.length} products`);
    } catch (e) {
      diagnostics.rapidApiError = e.message;
      console.log(`❌ RapidAPI Fallback failed: ${e.message}`);
    }
  }

  // 5. Print diagnostic summary
  console.log('\n📊 DATA SOURCE DIAGNOSTICS:');
  console.log(`   Google Trends: ${diagnostics.googleTrendsCount} products${diagnostics.googleTrendsError ? ` (Error: ${diagnostics.googleTrendsError})` : ''}`);
  console.log(`   Amazon Best Sellers: ${diagnostics.amazonBestSellersCount} products${diagnostics.amazonBestSellersError ? ` (Error: ${diagnostics.amazonBestSellersError})` : ''}`);
  console.log(`   RapidAPI: ${diagnostics.rapidApiCount} products${diagnostics.rapidApiError ? ` (Error: ${diagnostics.rapidApiError})` : ''}`);
  console.log(`   Total gathered: ${products.length} products\n`);

  // 6. Return products (will be filtered and deduplicated by applyFilters in site-generator)
  return products;
}

module.exports = { gatherTopProducts };
