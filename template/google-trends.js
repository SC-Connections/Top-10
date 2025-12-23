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
  
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
      await page.goto(`https://trends.google.com/trends/explore?q=${encodeURIComponent(niche)}`, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const data = await page.evaluate(() =>
        Array.from(document.querySelectorAll('div.feed-item'))
          .slice(0, 10)
          .map(el => ({
            title: el.querySelector('div.title')?.innerText || null,
            source: 'Google Trends'
          }))
      );

      await browser.close();
      return data.filter(item => item.title !== null);
    } catch (error) {
      console.error('Google Trends scraping error:', error.message);
      await browser.close();
      return [];
    }
  } catch (launchError) {
    console.error('Puppeteer launch error:', launchError.message);
    console.log('ℹ️  Skipping Google Trends scraping, will use fallback');
    return [];
  }
}

module.exports = { scrapeGoogleTrends };
