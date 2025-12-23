/**
 * Amazon Best Sellers Scraper
 * Uses Puppeteer to scrape best-selling products from Amazon
 */

const puppeteer = require('puppeteer');

/**
 * Scrape Amazon Best Sellers for a given niche
 * @param {string} niche - Niche name to search for
 * @returns {Promise<Array>} Array of products from Amazon Best Sellers
 */
async function scrapeAmazonBestSellers(niche) {
  // Skip Puppeteer scraping in CI if explicitly disabled
  if (process.env.SKIP_PUPPETEER === 'true') {
    console.log('ℹ️  Puppeteer scraping disabled (SKIP_PUPPETEER=true)');
    return [];
  }
  
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
      const url = `https://www.amazon.com/s?k=${encodeURIComponent(niche)}&s=review-rank`;
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const products = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.s-result-item'))
          .slice(0, 10)
          .map(el => ({
            title: el.querySelector('h2')?.innerText || null,
            asin: el.getAttribute('data-asin'),
            image: el.querySelector('img')?.src || null,
            rating: el.querySelector('.a-icon-alt')?.innerText || null,
            source: 'Amazon Best Sellers'
          }))
      );

      await browser.close();
      return products.filter(p => p.title !== null && p.asin !== null);
    } catch (error) {
      console.error('Amazon scraping error:', error.message);
      await browser.close();
      return [];
    }
  } catch (launchError) {
    console.error('Puppeteer launch error:', launchError.message);
    console.log('ℹ️  Skipping Amazon scraping, will use fallback');
    return [];
  }
}

module.exports = { scrapeAmazonBestSellers };
