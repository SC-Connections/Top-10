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
}

module.exports = { scrapeGoogleTrends };
