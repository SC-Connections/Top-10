/**
 * Google Trends Scraper
 * Uses Puppeteer to scrape trending products from Google Trends
 */

const puppeteer = require('puppeteer');

/**
 * Scrape Google Trends for a given niche
 * @param {string} niche - Niche name to search for
 * @returns {Promise<Array>} Array of products from Google Trends
 */
async function scrapeGoogleTrends(niche) {
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
      const targetUrl = `https://trends.google.com/trends/explore?q=${encodeURIComponent(niche)}`;
      console.log(`  📡 Navigating to: ${targetUrl}`);
      
      await page.goto(targetUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      console.log(`  ✓ Page loaded successfully`);

      // Check for CAPTCHA or blocking
      const pageContent = await page.content();
      if (pageContent.includes('captcha') || pageContent.includes('unusual traffic')) {
        console.warn('  ⚠️  CAPTCHA or blocking detected on Google Trends page');
        await browser.close();
        throw new Error('BLOCKED_CAPTCHA');
      }

      const data = await page.evaluate(() =>
        Array.from(document.querySelectorAll('div.feed-item'))
          .slice(0, 10)
          .map(el => ({
            title: el.querySelector('div.title')?.innerText || null,
            source: 'Google Trends'
          }))
      );
      
      console.log(`  ✓ Scraped ${data.length} items from Google Trends`);

      await browser.close();
      return data.filter(item => item.title !== null);
    } catch (error) {
      console.error('  ❌ Google Trends scraping error:', error.message);
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
    console.log('  ℹ️  Skipping Google Trends scraping, will use fallback');
    if (browser) {
      await browser.close();
    }
    throw new Error('PUPPETEER_LAUNCH_FAILED');
  }
}

module.exports = { scrapeGoogleTrends };
