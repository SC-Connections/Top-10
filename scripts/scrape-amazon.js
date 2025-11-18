#!/usr/bin/env node
/**
 * Amazon Scraper using Puppeteer
 * Scrapes Amazon Best Sellers and product details
 * Falls back to RapidAPI if Puppeteer fails
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG = {
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || '',
    RAPIDAPI_HOST: 'amazon-real-time-api.p.rapidapi.com',
    OUTPUT_DIR: path.join(__dirname, '..', 'data'),
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

/**
 * Scrape Amazon Best Sellers page using Puppeteer
 * @param {string} niche - Niche/category name
 * @param {object} options - Scraping options
 * @returns {Promise<Array>} Array of product objects
 */
async function scrapeAmazonBestSellers(niche, options = {}) {
    const maxProducts = options.maxProducts || 20;
    
    console.log(`🔍 Scraping Amazon Best Sellers for: ${niche}`);
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        await page.setUserAgent(CONFIG.USER_AGENT);
        
        // Search Amazon for the niche
        const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(niche)}&s=relevanceblender`;
        console.log(`📡 Navigating to: ${searchUrl}`);
        
        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for products to load
        await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });
        
        // Extract product data
        const products = await page.evaluate((maxProducts) => {
            const results = [];
            const productCards = document.querySelectorAll('[data-component-type="s-search-result"]');
            
            for (let i = 0; i < Math.min(productCards.length, maxProducts); i++) {
                const card = productCards[i];
                
                try {
                    // Extract ASIN
                    const asin = card.getAttribute('data-asin');
                    if (!asin) continue;
                    
                    // Extract title
                    const titleEl = card.querySelector('h2 a span');
                    const title = titleEl ? titleEl.textContent.trim() : null;
                    
                    // Extract image
                    const imgEl = card.querySelector('img.s-image');
                    const image = imgEl ? imgEl.src : null;
                    
                    // Extract price
                    const priceEl = card.querySelector('.a-price .a-offscreen');
                    const price = priceEl ? priceEl.textContent.trim() : null;
                    
                    // Extract rating
                    const ratingEl = card.querySelector('.a-icon-star-small .a-icon-alt');
                    const ratingText = ratingEl ? ratingEl.textContent.trim() : null;
                    const rating = ratingText ? parseFloat(ratingText.split(' ')[0]) : null;
                    
                    // Extract review count
                    const reviewEl = card.querySelector('[aria-label*="stars"]');
                    const reviewText = reviewEl ? reviewEl.getAttribute('aria-label') : null;
                    const reviewMatch = reviewText ? reviewText.match(/(\d+,?\d*)\s*global\s*rating/i) : null;
                    const reviews = reviewMatch ? reviewMatch[1].replace(/,/g, '') : null;
                    
                    // Only add products with required fields
                    if (asin && title && image && price) {
                        results.push({
                            asin,
                            title,
                            image,
                            price,
                            rating: rating ? String(rating) : '0',
                            reviews: reviews || '0'
                        });
                    }
                } catch (err) {
                    console.error('Error extracting product:', err.message);
                }
            }
            
            return results;
        }, maxProducts);
        
        console.log(`✅ Scraped ${products.length} products from Amazon`);
        
        // Fetch detailed information for each product
        const detailedProducts = [];
        for (const product of products) {
            try {
                const details = await scrapeProductDetails(page, product.asin);
                detailedProducts.push({ ...product, ...details });
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                console.warn(`⚠️ Failed to get details for ${product.asin}: ${err.message}`);
                detailedProducts.push(product);
            }
        }
        
        await browser.close();
        return detailedProducts;
        
    } catch (error) {
        console.error(`❌ Puppeteer scraping failed: ${error.message}`);
        if (browser) await browser.close();
        
        // Fallback to RapidAPI
        console.log('🔄 Falling back to RapidAPI...');
        return await scrapeAmazonViaRapidAPI(niche, maxProducts);
    }
}

/**
 * Scrape product details page
 * @param {object} page - Puppeteer page object
 * @param {string} asin - Product ASIN
 * @returns {Promise<object>} Product details
 */
async function scrapeProductDetails(asin, browser = null) {
    const shouldCloseBrowser = !browser;
    
    try {
        if (!browser) {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        
        const page = await browser.newPage();
        await page.setUserAgent(CONFIG.USER_AGENT);
        
        const productUrl = `https://www.amazon.com/dp/${asin}`;
        await page.goto(productUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        const details = await page.evaluate(() => {
            const result = {};
            
            // Extract brand
            const brandEl = document.querySelector('#bylineInfo');
            result.brand = brandEl ? brandEl.textContent.replace(/^(Brand:|Visit the|Store:)\s*/i, '').trim() : null;
            
            // Extract description
            const descEl = document.querySelector('#feature-bullets ul');
            if (descEl) {
                const bullets = Array.from(descEl.querySelectorAll('li span'))
                    .map(li => li.textContent.trim())
                    .filter(t => t.length > 0);
                result.features = bullets;
                result.description = bullets.slice(0, 3).join('. ') + '.';
            }
            
            // Extract more detailed description
            const productDesc = document.querySelector('#productDescription p');
            if (productDesc && productDesc.textContent.trim().length > 0) {
                result.description = productDesc.textContent.trim();
            }
            
            return result;
        });
        
        await page.close();
        if (shouldCloseBrowser) await browser.close();
        
        return details;
        
    } catch (error) {
        console.warn(`⚠️ Failed to scrape details for ${asin}: ${error.message}`);
        if (shouldCloseBrowser && browser) await browser.close();
        return {};
    }
}

/**
 * Fallback: Scrape using RapidAPI
 * @param {string} niche - Niche name
 * @param {number} maxProducts - Max products to fetch
 * @returns {Promise<Array>} Array of products
 */
async function scrapeAmazonViaRapidAPI(niche, maxProducts = 20) {
    try {
        if (!CONFIG.RAPIDAPI_KEY) {
            throw new Error('RAPIDAPI_KEY not configured');
        }
        
        console.log('📡 Fetching from RapidAPI...');
        
        const options = {
            method: 'GET',
            url: `https://${CONFIG.RAPIDAPI_HOST}/search`,
            params: {
                q: niche,
                country: 'US',
                sort_by: 'RELEVANCE'
            },
            headers: {
                'X-RapidAPI-Key': CONFIG.RAPIDAPI_KEY,
                'X-RapidAPI-Host': CONFIG.RAPIDAPI_HOST
            },
            timeout: 30000
        };
        
        const response = await axios.request(options);
        
        let productList = [];
        if (response.data && response.data.success && response.data.data && Array.isArray(response.data.data.results)) {
            productList = response.data.data.results;
        } else if (response.data && Array.isArray(response.data.results)) {
            productList = response.data.results;
        }
        
        console.log(`✅ Fetched ${productList.length} products from RapidAPI`);
        return productList.slice(0, maxProducts);
        
    } catch (error) {
        console.error(`❌ RapidAPI fallback failed: ${error.message}`);
        throw error;
    }
}

/**
 * Save scraped products to file
 * @param {string} niche - Niche name
 * @param {Array} products - Products array
 */
function saveProducts(niche, products) {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = path.join(CONFIG.OUTPUT_DIR, `${slug}-puppeteer.json`);
    
    const data = {
        niche,
        scrapedAt: new Date().toISOString(),
        method: 'puppeteer',
        productCount: products.length,
        products
    };
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Saved to: ${filename}`);
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const niche = args[0] || 'bluetooth headphones';
    const maxProducts = parseInt(args[1]) || 20;
    
    console.log('🚀 Amazon Scraper (Puppeteer)\n');
    console.log(`📦 Niche: ${niche}`);
    console.log(`🔢 Max Products: ${maxProducts}\n`);
    
    try {
        const products = await scrapeAmazonBestSellers(niche, { maxProducts });
        
        if (products.length === 0) {
            console.error('❌ No products found');
            process.exit(1);
        }
        
        saveProducts(niche, products);
        
        console.log('\n✅ Scraping complete!');
        console.log(`📊 Total products: ${products.length}`);
        
    } catch (error) {
        console.error(`\n❌ Scraping failed: ${error.message}`);
        process.exit(1);
    }
}

// Export functions
module.exports = {
    scrapeAmazonBestSellers,
    scrapeProductDetails,
    scrapeAmazonViaRapidAPI,
    saveProducts
};

// Run if called directly
if (require.main === module) {
    main();
}
