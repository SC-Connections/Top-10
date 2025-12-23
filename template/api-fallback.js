/**
 * RapidAPI Fallback
 * Fetches products from RapidAPI Amazon Real Time API as a fallback with pagination
 */

const fetch = require('node-fetch');

/**
 * Fetch products from RapidAPI as fallback with pagination
 * @param {string} niche - Niche name to search for
 * @returns {Promise<Array>} Array of products from RapidAPI
 */
async function rapidApiFallback(niche) {
  const allProducts = [];
  const MAX_PAGES = 5;
  const PAGE_SIZE = 20;
  const DELAY_MS = 900; // 900ms delay between requests
  
  try {
    console.log(`  🔄 RapidAPI: Fetching up to ${MAX_PAGES} pages with ${PAGE_SIZE} products each...`);
    
    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = `https://amazon-real-time-api.p.rapidapi.com/search?q=${encodeURIComponent(niche)}&country=US&page=${page}&page_size=${PAGE_SIZE}`;
        
        console.log(`  📄 Fetching page ${page}/${MAX_PAGES}...`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'amazon-real-time-api.p.rapidapi.com'
          },
          timeout: 15000
        });
        
        if (!response.ok) {
          console.warn(`  ⚠️  Page ${page} returned status ${response.status}, stopping pagination`);
          break;
        }
        
        const data = await response.json();
        
        // Parse response structure
        let productList = [];
        if (data && data.success && data.data && Array.isArray(data.data.results)) {
          productList = data.data.results;
        } else if (data && Array.isArray(data.results)) {
          productList = data.results;
        } else if (data && data.data && Array.isArray(data.data.products)) {
          productList = data.data.products;
        } else if (data && Array.isArray(data.products)) {
          productList = data.products;
        }
        
        if (productList.length === 0) {
          console.log(`  ℹ️  Page ${page} returned no products, stopping pagination`);
          break;
        }
        
        // Apply minimal filtering: only require ASIN, price, image, and title
        const filtered = productList.map(p => ({
          title: p.title || p.product_title || p.name || null,
          asin: p.asin || p.ASIN || null,
          image: p.image_url || p.image || p.product_photo || null,
          rating: p.rating || p.product_star_rating || '4.0',  // Default rating if missing
          reviews: p.reviews || p.review_count || '0',  // Default to 0 reviews
          price: p.price || p.product_price || null,
          source: 'RapidAPI Fallback'
        })).filter(p => {
          // Only require: valid ASIN, has price, has image, has title
          return p.title !== null && 
                 p.asin !== null && 
                 p.price !== null && 
                 p.image !== null &&
                 p.image.startsWith('http');
        });
        
        allProducts.push(...filtered);
        console.log(`  ✓ Page ${page}: Got ${filtered.length} valid products (total: ${allProducts.length})`);
        
        // Stop if we have enough products
        if (allProducts.length >= 40) {
          console.log(`  ✓ Reached target of 40+ products, stopping pagination`);
          break;
        }
        
        // Add delay between requests to respect rate limits (except after last request)
        if (page < MAX_PAGES && allProducts.length < 40) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
        
      } catch (pageError) {
        console.error(`  ⚠️  Error fetching page ${page}:`, pageError.message);
        // Continue to next page instead of failing completely
      }
    }
    
    console.log(`  ✅ RapidAPI fallback complete: ${allProducts.length} total products fetched`);
    return allProducts;
    
  } catch (error) {
    console.error('RapidAPI fallback error:', error.message);
    return [];
  }
}

module.exports = { rapidApiFallback };
