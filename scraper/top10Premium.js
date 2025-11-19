/**
 * Premium Bluetooth Headphone Scraper
 * Filters for premium brands, deduplicates by model, and maps to car categories
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Premium brand whitelist
const PREMIUM_BRANDS = [
  'Sony',
  'Bose',
  'Sennheiser',
  'Apple',
  'AirPods',
  'Bang & Olufsen',
  'Bowers & Wilkins',
  'Master & Dynamic',
  'Focal',
  'AKG',
  'Shure',
  'Beats Studio',
  'Beats Pro'
];

// Keywords to reject
const BLACKLIST_KEYWORDS = ['kids', 'gaming', 'cheap', 'budget'];

// TWS is allowed only if it's part of premium model names
const TWS_PREMIUM_EXCEPTIONS = ['sony', 'bose', 'sennheiser', 'apple'];

// Car categories (exactly 10)
const CAR_CATEGORIES = [
  'sedan',
  'suv',
  'hatchback',
  'convertible',
  'coupe',
  'pickup',
  'minivan',
  'wagon',
  'ev',
  'luxury'
];

// Color/size words to remove during normalization
const NORMALIZE_WORDS = [
  'black', 'white', 'navy', 'blue', 'red', 'green', 'silver', 'gold',
  'gray', 'grey', 'pink', 'purple', 'xl', 'large', 'small', 'medium',
  'xs', 'xxl', 'midnight', 'space', 'rose', 'limited', 'edition'
];

/**
 * Normalize title by removing color/size variants
 */
function normalizeTitle(title) {
  if (!title) return '';
  
  let normalized = title.toLowerCase().trim();
  
  // Remove color/size words
  NORMALIZE_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  });
  
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Check if product meets premium brand criteria
 */
function isPremiumBrand(title) {
  if (!title) return false;
  
  const titleLower = title.toLowerCase();
  
  // Check for Beats - must be Studio or Pro line
  if (titleLower.includes('beats')) {
    return titleLower.includes('studio') || titleLower.includes('pro');
  }
  
  // Check other premium brands
  return PREMIUM_BRANDS.some(brand => 
    titleLower.includes(brand.toLowerCase())
  );
}

/**
 * Check if product title contains blacklisted keywords
 */
function hasBlacklistedKeyword(title) {
  if (!title) return true;
  
  const titleLower = title.toLowerCase();
  
  // Check for TWS (except premium brands)
  if (titleLower.includes('tws')) {
    const hasPremiumException = TWS_PREMIUM_EXCEPTIONS.some(brand => 
      titleLower.includes(brand)
    );
    if (!hasPremiumException) return true;
  }
  
  // Check other blacklisted keywords
  return BLACKLIST_KEYWORDS.some(keyword => 
    titleLower.includes(keyword)
  );
}

/**
 * Scrape Google Trends RSS for trending Bluetooth headphone queries
 */
async function scrapeGoogleTrendsRSS() {
  console.log('🔍 Scraping Google Trends RSS...');
  
  try {
    const url = 'https://trends.google.com/trends/trendingsearches/daily/rss?geo=US';
    const response = await fetch(url);
    const text = await response.text();
    
    // Extract trending queries related to bluetooth headphones
    const queries = [];
    const itemRegex = /<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(text)) !== null) {
      const query = match[1].toLowerCase();
      if (query.includes('bluetooth') || query.includes('headphone') || 
          query.includes('wireless') || query.includes('earphone')) {
        queries.push(match[1]);
      }
    }
    
    console.log(`✓ Found ${queries.length} trending headphone queries`);
    return queries;
  } catch (error) {
    console.error('Google Trends RSS error:', error.message);
    return [];
  }
}

/**
 * Scrape Amazon Best Sellers for premium headphones
 */
async function scrapeAmazonBestSellers() {
  console.log('🔍 Scraping Amazon Best Sellers...');
  
  // Skip Puppeteer if disabled
  if (process.env.SKIP_PUPPETEER === 'true') {
    console.log('ℹ️  Puppeteer scraping disabled');
    return [];
  }
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
      // Navigate to Amazon Headphones > Over-Ear category
      const url = 'https://www.amazon.com/s?k=bluetooth+headphones&rh=n:172282,n:12097479011&s=review-rank';
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      const products = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[data-component-type="s-search-result"]'))
          .slice(0, 30) // Get more to filter from
          .map(el => {
            const titleEl = el.querySelector('h2 a span');
            const priceEl = el.querySelector('.a-price .a-offscreen');
            const ratingEl = el.querySelector('.a-icon-alt');
            const imageEl = el.querySelector('.s-image');
            const asin = el.getAttribute('data-asin');
            
            let price = null;
            if (priceEl) {
              const priceText = priceEl.textContent.replace(/[^0-9.]/g, '');
              price = parseFloat(priceText);
            }
            
            return {
              title: titleEl ? titleEl.textContent.trim() : null,
              asin: asin,
              price: price,
              rating: ratingEl ? ratingEl.textContent : null,
              image: imageEl ? imageEl.src : null,
              amazonUrl: asin ? `https://www.amazon.com/dp/${asin}` : null
            };
          })
          .filter(p => p.title && p.asin);
      });
      
      await browser.close();
      console.log(`✓ Scraped ${products.length} products from Amazon`);
      return products;
    } catch (error) {
      console.error('Amazon scraping error:', error.message);
      await browser.close();
      return [];
    }
  } catch (launchError) {
    console.error('Puppeteer launch error:', launchError.message);
    return [];
  }
}

/**
 * Fetch products from RapidAPI as fallback
 */
async function rapidApiFallback() {
  console.log('🔍 Using RapidAPI fallback...');
  
  if (!process.env.RAPIDAPI_KEY) {
    console.log('⚠️  RAPIDAPI_KEY not set, skipping fallback');
    return [];
  }
  
  try {
    const url = 'https://amazon-real-time-api.p.rapidapi.com/search?q=bluetooth+headphones+premium&country=US';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'amazon-real-time-api.p.rapidapi.com'
      }
    });
    
    const data = await response.json();
    
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
    
    const products = productList.slice(0, 30).map(p => {
      let price = null;
      if (p.price) {
        const priceText = p.price.toString().replace(/[^0-9.]/g, '');
        price = parseFloat(priceText);
      } else if (p.product_price) {
        const priceText = p.product_price.toString().replace(/[^0-9.]/g, '');
        price = parseFloat(priceText);
      }
      
      return {
        title: p.title || p.product_title || p.name || null,
        asin: p.asin || p.ASIN || null,
        image: p.image_url || p.image || p.product_photo || null,
        rating: p.rating || p.product_star_rating || null,
        price: price,
        amazonUrl: p.product_url || (p.asin ? `https://www.amazon.com/dp/${p.asin}` : null)
      };
    }).filter(p => p.title && p.asin);
    
    console.log(`✓ RapidAPI returned ${products.length} products`);
    return products;
  } catch (error) {
    console.error('RapidAPI error:', error.message);
    return [];
  }
}

/**
 * Calculate trend score based on product position
 */
function calculateTrendScore(index, total) {
  // Higher score for products appearing earlier
  return Math.round(100 - (index / total) * 50);
}

/**
 * Filter and deduplicate products
 */
function filterAndDeduplicate(products) {
  console.log('\n🔧 Filtering and deduplicating products...');
  
  // Step 1: Filter for premium brands
  let filtered = products.filter(p => isPremiumBrand(p.title));
  console.log(`✓ After brand filter: ${filtered.length} products`);
  
  // Step 2: Filter by price (>= $150)
  filtered = filtered.filter(p => {
    if (!p.price || p.price < 150) return false;
    return true;
  });
  console.log(`✓ After price filter (≥$150): ${filtered.length} products`);
  
  // Step 3: Remove blacklisted keywords
  filtered = filtered.filter(p => !hasBlacklistedKeyword(p.title));
  console.log(`✓ After keyword filter: ${filtered.length} products`);
  
  // Step 4: Normalize titles and deduplicate
  const seenModels = new Map();
  const deduped = [];
  
  filtered.forEach((product, index) => {
    const normalized = normalizeTitle(product.title);
    
    if (!seenModels.has(normalized)) {
      seenModels.set(normalized, true);
      deduped.push({
        ...product,
        normalizedTitle: normalized,
        trendScore: calculateTrendScore(index, filtered.length)
      });
    }
  });
  
  console.log(`✓ After deduplication: ${deduped.length} unique models`);
  
  return deduped;
}

/**
 * Map products to car categories
 */
function mapToCategories(products) {
  console.log('\n🚗 Mapping products to car categories...');
  
  const result = [];
  
  // Take up to 10 products and map to categories
  const productsToMap = products.slice(0, 10);
  
  productsToMap.forEach((product, index) => {
    // Extract brand from title
    let brand = 'Unknown';
    for (const premiumBrand of PREMIUM_BRANDS) {
      if (product.title.toLowerCase().includes(premiumBrand.toLowerCase())) {
        brand = premiumBrand;
        break;
      }
    }
    
    // Extract model name (simplified - take title without brand)
    let model = product.title;
    if (brand !== 'Unknown') {
      model = product.title.replace(new RegExp(brand, 'gi'), '').trim();
    }
    
    result.push({
      category: CAR_CATEGORIES[index],
      rank: index + 1,
      brand: brand,
      model: model,
      normalizedTitle: product.normalizedTitle,
      asin: product.asin,
      price: product.price,
      image: product.image || 'https://via.placeholder.com/300',
      amazonUrl: product.amazonUrl || `https://www.amazon.com/dp/${product.asin}`,
      trendScore: product.trendScore
    });
  });
  
  console.log(`✓ Mapped ${result.length} products to categories`);
  return result;
}

/**
 * Main scraper function
 */
async function scrapePremiumHeadphones() {
  console.log('🎧 Premium Bluetooth Headphone Scraper\n');
  console.log('=' .repeat(60));
  
  // Step 1: Gather trending queries from Google Trends
  const trendingQueries = await scrapeGoogleTrendsRSS();
  
  // Step 2: Scrape Amazon for products
  let products = await scrapeAmazonBestSellers();
  
  // Step 3: If fewer than 10 premium products, use RapidAPI fallback
  const filteredProducts = filterAndDeduplicate(products);
  
  if (filteredProducts.length < 10) {
    console.log(`\n⚠️  Only ${filteredProducts.length} premium products found, using RapidAPI fallback...`);
    const fallbackProducts = await rapidApiFallback();
    products = [...products, ...fallbackProducts];
  }
  
  // Step 4: Filter and deduplicate all products
  const finalFiltered = filterAndDeduplicate(products);
  
  // Step 5: Map to car categories
  const categorizedProducts = mapToCategories(finalFiltered);
  
  // Step 6: Save to output file
  const outputPath = path.join(__dirname, '..', 'data', 'top10_premium_headphones.json');
  fs.writeFileSync(outputPath, JSON.stringify(categorizedProducts, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully saved ${categorizedProducts.length} products to:`);
  console.log(`   ${outputPath}`);
  console.log('=' .repeat(60));
  
  return categorizedProducts;
}

// Export for testing
module.exports = {
  scrapePremiumHeadphones,
  normalizeTitle,
  isPremiumBrand,
  hasBlacklistedKeyword,
  filterAndDeduplicate,
  mapToCategories
};

// Run if called directly
if (require.main === module) {
  scrapePremiumHeadphones().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
