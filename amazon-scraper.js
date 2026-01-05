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
  
  let browser = null;
  
  try {
    console.log('  🚀 Launching Puppeteer browser...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
      const url = `https://www.amazon.com/s?k=${encodeURIComponent(niche)}&s=review-rank`;
      console.log(`  📡 Navigating to: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log(`  ✓ Page loaded successfully`);

      // Check for CAPTCHA or blocking
      const pageContent = await page.content();
      if (pageContent.includes('Enter the characters you see below') || 
          pageContent.includes('Sorry, we just need to make sure you')) {
        console.warn('  ⚠️  CAPTCHA or blocking detected on Amazon page');
        await browser.close();
        throw new Error('BLOCKED_CAPTCHA');
      }

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
      
      console.log(`  ✓ Scraped ${products.length} items from Amazon Best Sellers`);

      await browser.close();
      return products.filter(p => p.title !== null && p.asin !== null);
    } catch (error) {
      console.error('  ❌ Amazon scraping error:', error.message);
      if (error.message.includes('timeout')) {
        console.error('  ❌ Navigation timeout - page took too long to load');
        throw new Error('TIMEOUT');
      } else if (error.message.includes('BLOCKED_CAPTCHA')) {
        throw new Error('BLOCKED_CAPTCHA');
      } else {
        console.error('  ❌ Selector or evaluation error - page structure may have changed');
        throw new Error('SELECTOR_NOT_FOUND');
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (launchError) {
    console.error('  ❌ Puppeteer launch error:', launchError.message);
    console.log('  ℹ️  Skipping Amazon scraping, will use fallback');
    if (browser) {
      await browser.close();
    }
    throw new Error('PUPPETEER_LAUNCH_FAILED');
  }
}

module.exports = { scrapeAmazonBestSellers };
