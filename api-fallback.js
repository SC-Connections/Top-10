/**
 * RapidAPI Fallback
 * Fetches products from RapidAPI Amazon Real Time API as a fallback
 */

const fetch = require('node-fetch');

/**
 * Fetch products from RapidAPI as fallback
 * @param {string} niche - Niche name to search for
 * @returns {Promise<Array>} Array of products from RapidAPI
 */
async function rapidApiFallback(niche) {
  try {
    const url = `https://amazon-real-time-api.p.rapidapi.com/search?q=${encodeURIComponent(niche)}&country=US`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'amazon-real-time-api.p.rapidapi.com'
      }
    });
    
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
    
    return productList.slice(0, 10).map(p => ({
      title: p.title || p.product_title || p.name || null,
      asin: p.asin || p.ASIN || null,
      image: p.image_url || p.image || p.product_photo || null,
      rating: p.rating || p.product_star_rating || null,
      price: p.price || p.product_price || null,
      source: 'RapidAPI Fallback'
    })).filter(p => p.title !== null && p.asin !== null);
  } catch (error) {
    console.error('RapidAPI fallback error:', error.message);
    return [];
  }
}

module.exports = { rapidApiFallback };
