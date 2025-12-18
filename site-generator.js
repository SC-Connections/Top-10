/**
 * Main Site Generator
 * Generates complete niche review sites using Amazon product data
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// Original SEO functions kept for backward compatibility with other modules
const { generateIntroContent, generateBuyersGuide, generateFAQ, generateFAQStructuredData, generateCTA } = require('./generate-seo');
const { generateBlogArticle } = require('./generate-blog');
const { gatherTopProducts } = require('./data-sources');
// Niche state management for incremental builds
const { 
    loadNicheState, 
    saveNicheState, 
    getNichesToBuildIncremental, 
    getNichesToBuildRefresh 
} = require('./niche-state-manager');

// Configuration
const CONFIG = {
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || '',
    RAPIDAPI_HOST: 'amazon-real-time-api.p.rapidapi.com',
    AMAZON_AFFILIATE_ID: process.env.AMAZON_AFFILIATE_ID || 'scconnec0d-20',
    AMAZON_DOMAIN: 'US',
    BASE_URL: 'https://sc-connections.github.io/Top-10',
    NICHES_FILE: path.join(__dirname, 'niches.csv'),
    TEMPLATES_DIR: path.join(__dirname, 'templates'),
    OUTPUT_DIR: __dirname,
    DATA_DIR: path.join(__dirname, 'data'),
    MAX_FEATURE_LENGTH: 150,  // Maximum length for generated feature from description
    // Product fetching configuration
    MAX_RETRIES: 3,           // Number of retry attempts when products < MIN_PRODUCTS
    MIN_PRODUCTS: 8,          // Minimum number of products required before retrying (lowered from 10 to 8)
    RETRY_DELAY_MS: 2000,     // Delay between retry attempts in milliseconds
    TARGET_COUNT: 10,         // Target number of products per niche
    MIN_ACCEPTABLE: 4         // Minimum acceptable number of products (graceful degradation, lowered from 6 to 4)
};

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Starting niche site generator...\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const modeArg = args.find(arg => arg.startsWith('--mode='));
    const mode = modeArg ? modeArg.split('=')[1] : 'incremental';
    
    if (!['incremental', 'refresh'].includes(mode)) {
        console.error(`❌ ERROR: Invalid mode "${mode}". Must be "incremental" or "refresh"`);
        process.exit(1);
    }
    
    console.log(`🔧 Mode: ${mode}`);
    console.log(`   - incremental: Only build new or changed niches`);
    console.log(`   - refresh: Only build niches older than 7 days\n`);
    
    // Validate API credentials
    if (!CONFIG.RAPIDAPI_KEY || CONFIG.RAPIDAPI_KEY === '') {
        console.error('❌ ERROR: RAPIDAPI_KEY is not set');
        console.error('❌ Cannot proceed without valid API credentials');
        console.error('❌ Set RAPIDAPI_KEY environment variable or GitHub secret');
        process.exit(1);
    }
    
    console.log('✅ API credentials validated');
    console.log(`📡 API Host: ${CONFIG.RAPIDAPI_HOST}`);
    console.log(`🌍 Amazon Domain: ${CONFIG.AMAZON_DOMAIN}\n`);
    
    // Create data directory for API responses
    if (!fs.existsSync(CONFIG.DATA_DIR)) {
        fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
        console.log(`📁 Created data directory: ${CONFIG.DATA_DIR}\n`);
    }
    
    // Read niches from CSV
    const allNiches = readNiches();
    console.log(`📋 Found ${allNiches.length} niches in CSV\n`);
    
    // Load state and determine which niches to build
    const state = loadNicheState();
    
    let nichesToBuild;
    if (mode === 'refresh') {
        nichesToBuild = getNichesToBuildRefresh(allNiches, state, 7);
    } else {
        nichesToBuild = getNichesToBuildIncremental(allNiches, state);
    }
    
    console.log(`\n🧱 Mode: ${mode}, niches to build: ${nichesToBuild.length}/${allNiches.length}\n`);
    
    if (nichesToBuild.length === 0) {
        console.log('✅ No niches need to be built. All niches are up to date!');
        console.log('🎉 Site generation complete!');
        return;
    }
    
    // Track generated niche URLs for index page
    const generatedNiches = [];
    const failedNiches = [];
    
    // Process each niche that needs building
    for (let i = 0; i < nichesToBuild.length; i++) {
        const { niche, slug, hash } = nichesToBuild[i];
        
        try {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📦 Processing (${i + 1}/${nichesToBuild.length}): ${niche}`);
            console.log('='.repeat(60));
            
            await generateSiteForNiche(niche);
            
            // All sites are kept in this repository at /{slug}/
            const publicUrl = `${CONFIG.BASE_URL}/${slug}/`;
            
            generatedNiches.push({ niche, slug, url: publicUrl });
            console.log(`✅ Successfully generated site for: ${niche}\n`);
            
            // Update state after successful build
            state[slug] = {
                hash,
                lastBuild: new Date().toISOString()
            };
            
            // Rate limiting: Add delay between niches to avoid hitting API rate limits
            if (i < nichesToBuild.length - 1) {
                const delaySeconds = 3;
                console.log(`⏳ Waiting ${delaySeconds} seconds before processing next niche (rate limiting)...`);
                await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            }
        } catch (error) {
            console.error(`❌ Error generating site for ${niche}:`, error.message);
            failedNiches.push({ niche, error: error.message });
            // Continue with other niches instead of stopping completely
        }
    }
    
    // Save updated state
    saveNicheState(state);
    
    // Save generated niches data for index page (always write file, may be empty)
    const dataFile = path.join(CONFIG.OUTPUT_DIR, '_niches_data.json');
    fs.writeFileSync(dataFile, JSON.stringify(generatedNiches, null, 2));
    console.log(`\n📝 Saved niche data to: ${dataFile}`);
    
    // Report summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully generated: ${generatedNiches.length} sites`);
    console.log(`❌ Failed: ${failedNiches.length} sites`);
    console.log(`⏭️  Skipped (up to date): ${allNiches.length - nichesToBuild.length} sites`);
    
    if (generatedNiches.length > 0) {
        console.log('\n✅ Generated Sites:');
        generatedNiches.forEach(({ niche, url }) => {
            console.log(`   - ${niche}: ${url}`);
        });
    }
    
    if (failedNiches.length > 0) {
        console.log('\n❌ Failed Sites:');
        failedNiches.forEach(({ niche, error }) => {
            console.log(`   - ${niche}: ${error}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Only fail if there's a fatal GitHub error, not if all niches failed
    // Individual niche failures are acceptable - they get empty results pages
    console.log('\n🎉 Site generation complete!');
}

/**
 * Read niches from CSV file
 * @returns {Array<string>} Array of niche names
 */
function readNiches() {
    const content = fs.readFileSync(CONFIG.NICHES_FILE, 'utf-8');
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

/**
 * Generate a complete site for a niche
 * @param {string} niche - Niche name
 */
async function generateSiteForNiche(niche) {
    const slug = createSlug(niche);
    const siteDir = path.join(CONFIG.OUTPUT_DIR, slug);
    const blogDir = path.join(siteDir, 'blog');
    
    // Create directories
    if (fs.existsSync(siteDir)) {
        fs.rmSync(siteDir, { recursive: true, force: true });
    }
    fs.mkdirSync(siteDir, { recursive: true });
    fs.mkdirSync(blogDir, { recursive: true });
    
    console.log(`📁 Created directories for ${slug}`);
    
    // Load templates FIRST - before any processing
    const templates = loadTemplates();
    
    // Fetch products from Amazon API
    console.log('🔍 Fetching products from Amazon...');
    const products = await fetchProducts(niche);
    
    // Validate products before generating HTML
    if (products.length === 0) {
        console.error(`❌ ERROR: No products found for "${niche}" - Skipping.`);
        generateEmptyResultsPage(siteDir, niche, slug, templates);
        console.log(`✓ Empty-results page generated at: /${slug}/`);
        return;
    }
    
    console.log(`✓ Found ${products.length} valid products`);
    
    // Generate SEO content
    console.log('📝 Generating SEO content...');
    const seoContent = generateSEOContent(niche, products);
    
    // Generate product cards HTML
    console.log('🎨 Generating product cards...');
    const productsHTML = generateProductsHTML(products, templates.productTemplate, niche);
    
    // Generate main index.html
    console.log('📄 Creating index.html...');
    const indexHTML = generateIndexHTML(niche, slug, templates, seoContent, productsHTML, products);
    fs.writeFileSync(path.join(siteDir, 'index.html'), indexHTML);
    
    // Generate how-we-pick-products.html page
    console.log('📄 Creating how-we-pick-products.html...');
    generateHowWePickPage(siteDir, niche, slug);
    
    // Generate blog articles for each product
    console.log('📰 Generating blog articles...');
    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const blogHTML = generateBlogHTML(product, niche, i + 1, templates);
        const blogFilename = `${product.asin}.html`;
        fs.writeFileSync(path.join(blogDir, blogFilename), blogHTML);
    }
    
    // Copy CSS (create both global.css and styles.css for compatibility)
    console.log('🎨 Copying styles...');
    const cssContent = fs.readFileSync(path.join(CONFIG.TEMPLATES_DIR, 'global.css'), 'utf-8');
    fs.writeFileSync(path.join(siteDir, 'global.css'), cssContent);
    fs.writeFileSync(path.join(siteDir, 'styles.css'), cssContent);
    
    // Generate README.md
    console.log('📝 Creating README.md...');
    const readme = generateReadme(niche, slug, products.length);
    fs.writeFileSync(path.join(siteDir, 'README.md'), readme);
    
    console.log(`✓ Site generated at: /${slug}/`);
}

/**
 * Generate how-we-pick-products.html page
 * @param {string} siteDir - Site directory
 * @param {string} niche - Niche name
 * @param {string} slug - URL slug
 */
function generateHowWePickPage(siteDir, niche, slug) {
    const templatePath = path.join(CONFIG.TEMPLATES_DIR, 'how-we-pick-products.html');
    
    // Check if template exists
    if (!fs.existsSync(templatePath)) {
        console.warn('⚠️  how-we-pick-products.html template not found, skipping');
        return;
    }
    
    let html = fs.readFileSync(templatePath, 'utf-8');
    
    // Replace placeholders
    html = html.replace(/{{NICHE}}/g, niche);
    html = html.replace(/{{PAGE_URL}}/g, `${CONFIG.BASE_URL}/${slug}/`);
    
    fs.writeFileSync(path.join(siteDir, 'how-we-pick-products.html'), html);
}

/**
 * Generate empty results page when no valid products are found
 * @param {string} siteDir - Site directory path
 * @param {string} niche - Niche name
 * @param {string} slug - URL slug
 * @param {object} templates - Templates object
 */
function generateEmptyResultsPage(siteDir, niche, slug, templates) {
    const templateData = templates.templateJSON;
    // Use ISO date format for consistency
    const lastUpdated = process.env.UPDATE_TIMESTAMP || new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    
    let html = templates.mainTemplate;
    
    // Replace all placeholders with empty state content
    html = html.replace(/{{TITLE}}/g, `${niche} - No Results Available`);
    html = html.replace(/{{META_DESCRIPTION}}/g, `Currently no products available for ${niche}. Check back soon for updated results.`);
    html = html.replace(/{{META_KEYWORDS}}/g, templateData.meta_keywords.replace(/{{NICHE}}/g, niche).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{NICHE}}/g, niche);
    html = html.replace(/{{HERO_TITLE}}/g, `Best ${niche} (${currentYear})`);
    html = html.replace(/{{INTRO_TITLE}}/g, `About ${niche}`);
    html = html.replace(/{{INTRO_PARAGRAPH}}/g, `<p>We're currently updating our list of the best ${niche.toLowerCase()}. Please check back soon for comprehensive reviews and recommendations.</p>`);
    html = html.replace(/{{COMPARISON_TABLE}}/g, '');
    html = html.replace(/{{PRODUCTS_SECTION_TITLE}}/g, `No Products Available`);
    html = html.replace(/{{PRODUCTS_LIST}}/g, `<div class="empty-results"><p>⚠️ No products with complete information are currently available for this category. We're working on updating our database. Please check back soon!</p></div>`);
    html = html.replace(/{{BUYERS_GUIDE_TITLE}}/g, `Buyer's Guide - Coming Soon`);
    html = html.replace(/{{BUYERS_GUIDE_CONTENT}}/g, `<p>Our comprehensive buyer's guide will be available once we have product data to analyze.</p>`);
    html = html.replace(/{{FAQ_TITLE}}/g, `FAQ - Coming Soon`);
    html = html.replace(/{{FAQ_CONTENT}}/g, `<p>Frequently asked questions will be added once product reviews are available.</p>`);
    html = html.replace(/{{FAQ_STRUCTURED_DATA}}/g, '<!-- FAQ schema will be added when products are available -->');
    html = html.replace(/{{CTA_CONTENT}}/g, `<p>Check back soon for updated product recommendations!</p>`);
    html = html.replace(/{{LAST_UPDATED}}/g, lastUpdated);
    html = html.replace(/{{STRUCTURED_DATA}}/g, '{}');
    html = html.replace(/{{BASE_URL}}/g, CONFIG.BASE_URL);
    html = html.replace(/{{PAGE_URL}}/g, `${CONFIG.BASE_URL}/${slug}/`);
    
    fs.writeFileSync(path.join(siteDir, 'index.html'), html);
    
    // Copy CSS (create both global.css and styles.css)
    const cssContent = fs.readFileSync(path.join(CONFIG.TEMPLATES_DIR, 'global.css'), 'utf-8');
    fs.writeFileSync(path.join(siteDir, 'global.css'), cssContent);
    fs.writeFileSync(path.join(siteDir, 'styles.css'), cssContent);
    
    // Generate README.md for empty results page
    const readme = generateReadme(niche, slug, 0);
    fs.writeFileSync(path.join(siteDir, 'README.md'), readme);
}

/**
 * Create URL-friendly slug from niche name
 * @param {string} niche - Niche name
 * @returns {string} Slug
 */
function createSlug(niche) {
    return niche
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Properly capitalize niche names for display
 * Handles special cases like "bluetooth" -> "Bluetooth"
 * @param {string} niche - Niche name
 * @returns {string} Properly capitalized niche name
 */
function formatNicheName(niche) {
    // Special cases for technology terms and proper nouns
    const specialCases = {
        'bluetooth': 'Bluetooth',
        'wifi': 'Wi-Fi',
        'wi-fi': 'Wi-Fi',
        'usb': 'USB',
        'hdmi': 'HDMI',
        'rgb': 'RGB',
        'led': 'LED',
        'oled': 'OLED',
        'lcd': 'LCD',
        '4k': '4K',
        '8k': '8K',
        'hd': 'HD',
        'ai': 'AI',
        'gopro': 'GoPro',
        'iphone': 'iPhone',
        'ipad': 'iPad',
        'xbox': 'Xbox',
        'playstation': 'PlayStation',

        'ev': 'EV',
        'gps': 'GPS',
        'rfid': 'RFID',
        'obd2': 'OBD2',
        'adhd': 'ADHD',
        'hud': 'HUD'
    };
    
    // Split by spaces and hyphens but keep hyphens for reconstruction
    const words = niche.toLowerCase().split(/(\s+|-)/);
    
    const capitalizedWords = words.map(word => {
        // Preserve spaces and hyphens
        if (word.match(/^\s+$/) || word === '-') {
            return word;
        }
        
        // Check special cases first
        const lowerWord = word.toLowerCase();
        if (specialCases[lowerWord]) {
            return specialCases[lowerWord];
        }
        
        // Regular title case
        return word.charAt(0).toUpperCase() + word.slice(1);
    });
    
    return capitalizedWords.join('');
}

/**
 * Fetch product details from /product_details/ endpoint
 * @param {string} asin - Product ASIN
 * @returns {Promise<object|null>} Product details or null if failed
 */
async function fetchProductDetails(asin) {
    try {
        const options = {
            method: 'GET',
            url: `https://${CONFIG.RAPIDAPI_HOST}/product_details`,
            params: {
                asin: asin,
                domain: 'US'
            },
            headers: {
                'X-RapidAPI-Key': CONFIG.RAPIDAPI_KEY,
                'X-RapidAPI-Host': CONFIG.RAPIDAPI_HOST
            },
            timeout: 30000
        };
        
        console.log(`  🔍 Fetching details for ASIN: ${asin}`);
        const response = await axios.request(options);
        
        // Extract product details from response
        let details = null;
        if (response.data && response.data.data) {
            details = response.data.data;
        } else if (response.data) {
            details = response.data;
        }
        
        if (details) {
            console.log(`  ✅ Got details for ASIN: ${asin}`);
        }
        
        return details;
    } catch (error) {
        console.warn(`  ⚠️  Failed to fetch details for ASIN ${asin}: ${error.message}`);
        return null;
    }
}

/**
 * Normalize product model name for deduplication
 * Removes color variants, size indicators, edition markers
 * @param {string} title - Product title
 * @returns {string} Normalized model name
 */
function normalizeModelName(title) {
  // Color variants to remove
  const colorWords = [
    'black', 'white', 'silver', 'gold', 'rose gold', 'space gray', 'space grey',
    'midnight', 'starlight', 'blue', 'red', 'green', 'pink', 'purple', 'orange',
    'navy', 'gray', 'grey', 'bronze', 'copper', 'champagne', 'graphite',
    'slate blue', 'cloud pink', 'sand gray', 'twilight blue', 'jet black',
    'sky blue', 'cream', 'beige', 'brown', 'yellow', 'teal', 'coral'
  ];
  
  // Edition markers to remove
  const editionWords = ['limited edition', 'special edition', 'amazon exclusive'];
  
  let normalized = title.toLowerCase();
  
  // Remove content in parentheses
  normalized = normalized.replace(/\([^)]*\)/g, '');
  
  // Remove content after " - " or " – " (often contains color/variant info)
  normalized = normalized.replace(/\s[-–]\s.*$/, '');
  
  // Remove color words using a single regex with alternation for better performance
  const colorPattern = new RegExp(`\\b(${colorWords.join('|')})\\b`, 'gi');
  normalized = normalized.replace(colorPattern, '');
  
  // Remove edition markers using a single regex
  const editionPattern = new RegExp(`(${editionWords.join('|')})`, 'gi');
  normalized = normalized.replace(editionPattern, '');
  
  // Clean up extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Apply multi-tier quality filters and deduplication
 * @param {Array} products - Products array
 * @param {object} options - Options including TARGET_COUNT and MIN_ACCEPTABLE
 * @returns {object} Filtered products and stats
 */
function applyFilters(products, options = {}) {
  const TARGET_COUNT = options.TARGET_COUNT || 10;
  const MIN_ACCEPTABLE = options.MIN_ACCEPTABLE || 6;
  
  // Tier A: Premium brands (highest quality)
  const PREMIUM_BRANDS = [
    "Apple","Sony","Bose","Sennheiser","Bang & Olufsen",
    "Shure","Razer","Logitech","Samsung","JBL","Beats","HP","Dell","Lenovo",
    "Garmin","Fitbit","Fossil","Skullcandy","Audio-Technica","Anker","Microsoft",
    "LG","Asus","Acer","MSI","Alienware","Corsair","SteelSeries","HyperX",
    "Jabra","Plantronics","Philips","Panasonic","TCL","Hisense","Vizio",
    "Nintendo","PlayStation","Xbox","Oculus","Meta","Google","Amazon","Kindle"
  ];

  // Tier B: Reputable brands (expanded list)
  const REPUTABLE_BRANDS = [
    ...PREMIUM_BRANDS,
    "Mpow","Tozo","Tribit","EarFun","Soundcore","1MORE","Jaybird",
    "Xiaomi","OnePlus","Huawei","Oppo","Realme","Nothing","Motorola",
    "Amazfit","Withings","Polar","Suunto","Coros","Mobvoi","TicWatch",
    "ROG","Republic of Gamers","Turtle Beach","Astro","EPOS",
    "Dyson","Roomba","iRobot","Ecovacs","Roborock","Shark","Eufy",
    "Canon","Nikon","Fujifilm","GoPro","DJI","Insta360","Olympus",
    "Bowers & Wilkins","Master & Dynamic","Focal","AKG","Beyerdynamic",
    "Marshall","Denon","Harman Kardon","KEF","Klipsch",
    "TP-Link","Netgear","Linksys","Arlo","Ring","Wyze","Nest",
    "Kasa","Tapo","Meross","Wemo","Lutron","Leviton","GE",
    "Black+Decker","Stanley","DeWalt","Craftsman","Kobalt","Milwaukee",
    "Instant Pot","Ninja","Cuisinart","KitchenAid","Breville","Oster",
    "Cosori","Gourmia","Chefman","Dash","Hamilton Beach","Proctor Silex"
  ];

  // Tier C: Generic blocklist (reject only truly generic/accessory items)
  const GENERIC_BLOCKLIST = [
    "generic", "brandless", "no brand",
    " case", " cover", " skin", " adapter", " cable",
    " strap", " mount", " stand", " holder", " charger cable",
    " charging cable", " usb cable", " power cord", " wall charger",
    " car charger", " screen protector", " tempered glass"
  ];

  // Track skip reasons for logging
  const skipReasons = {};
  function recordSkip(reason) {
    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
  }

  // Normalize and deduplicate candidates
  const seenAsins = new Set();
  const seenModels = new Set();
  const candidates = [];

  console.log(`\n🔍 Starting multi-tier filtering with ${products.length} products...`);

  for (const p of products) {
    const title = (p.title || "").trim();
    const titleLower = title.toLowerCase();
    const rating = parseFloat(p.rating) || 0;
    const asin = p.asin || null;

    // Skip products with empty/null titles
    if (!title || title.length === 0) {
      recordSkip('empty_title');
      continue;
    }

    // Skip products without ASIN
    if (!asin) {
      recordSkip('missing_asin');
      continue;
    }

    // Deduplicate by ASIN (primary)
    if (seenAsins.has(asin)) {
      recordSkip('duplicate_asin');
      continue;
    }
    
    // Deduplicate by normalized model name (removes color variants)
    const normalizedModel = normalizeModelName(title);
    
    if (seenModels.has(normalizedModel)) {
      recordSkip('duplicate_model');
      continue;
    }
    
    seenAsins.add(asin);
    seenModels.add(normalizedModel);

    // Store as candidate
    candidates.push({ ...p, title, titleLower, rating });
  }

  console.log(`✓ After deduplication: ${candidates.length} unique products`);

  // Multi-pass selection algorithm
  let selected = [];
  let tierBCount = 0;
  let tierCCount = 0;
  
  // Pass 1: Tier A - Premium brands
  const tierA = candidates.filter(p => {
    return PREMIUM_BRANDS.some(brand => p.titleLower.includes(brand.toLowerCase()));
  });
  selected.push(...tierA);
  console.log(`✓ Tier A (Premium brands): ${tierA.length} products`);

  // Pass 2: Tier B - Reputable brands (if needed)
  if (selected.length < TARGET_COUNT) {
    const tierB = candidates.filter(p => {
      // Exclude already selected
      if (selected.some(s => s.asin === p.asin)) return false;
      // Check reputable brands
      return REPUTABLE_BRANDS.some(brand => p.titleLower.includes(brand.toLowerCase()));
    });
    tierBCount = tierB.length;
    selected.push(...tierB);
    console.log(`✓ Tier B (Reputable brands): ${tierBCount} products added`);
  }

  // Pass 3: Tier C - Generic blocklist filter (if still needed)
  if (selected.length < TARGET_COUNT) {
    const tierC = candidates.filter(p => {
      // Exclude already selected
      if (selected.some(s => s.asin === p.asin)) return false;
      
      // Apply generic blocklist
      for (const term of GENERIC_BLOCKLIST) {
        if (p.titleLower.includes(term)) {
          recordSkip('generic_term');
          return false;
        }
      }
      
      // Check for accessory-only patterns
      const accessoryPatterns = [
        /^\d+\s*(pack|pcs|piece|set)/i,
        /^(universal|generic|replacement|compatible)/i,
        /case for|cover for|skin for|mount for|holder for/i
      ];
      
      for (const pattern of accessoryPatterns) {
        if (pattern.test(p.title)) {
          recordSkip('accessory_pattern');
          return false;
        }
      }
      
      return true;
    });
    tierCCount = tierC.length;
    selected.push(...tierC);
    console.log(`✓ Tier C (Generic filter): ${tierCCount} products added`);
  }

  // Sort by quality: premium first, then rating, then reviews
  selected.sort((a, b) => {
    // Premium brands first
    const aIsPremium = PREMIUM_BRANDS.some(brand => a.titleLower.includes(brand.toLowerCase()));
    const bIsPremium = PREMIUM_BRANDS.some(brand => b.titleLower.includes(brand.toLowerCase()));
    if (aIsPremium !== bIsPremium) return bIsPremium ? 1 : -1;
    
    // Then by rating
    if (Math.abs(a.rating - b.rating) > 0.1) return b.rating - a.rating;
    
    // Then by review count
    return (parseInt(b.reviews) || 0) - (parseInt(a.reviews) || 0);
  });

  // Limit to TARGET_COUNT
  const final = selected.slice(0, TARGET_COUNT);
  
  console.log(`✓ Final selection: ${final.length} products`);
  
  // Log top skip reasons
  const topSkipReasons = Object.entries(skipReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  if (topSkipReasons.length > 0) {
    console.log(`\n📊 Top skip reasons:`);
    topSkipReasons.forEach(([reason, count]) => {
      console.log(`   - ${reason}: ${count}`);
    });
  }

  // Return results with stats
  return {
    products: final,
    stats: {
      gathered: products.length,
      validated: candidates.length,
      tierA: tierA.length,
      tierB: tierBCount,
      tierC: tierCCount,
      final: final.length,
      skipReasons: topSkipReasons
    }
  };
}

/**
 * Fetch products from Amazon API
 * @param {string} niche - Niche name
 * @returns {Promise<Array>} Array of product objects
 */
async function fetchProducts(niche) {
    const slug = createSlug(niche);
    const dataFile = path.join(CONFIG.DATA_DIR, `${slug}.json`);
    
    try {
        // Use new intelligent data layer to gather products from multiple sources
        // Retry up to MAX_RETRIES times if we get fewer than MIN_PRODUCTS products
        let products = [];
        let filteredProducts = [];
        
        for (let retry = 0; retry < CONFIG.MAX_RETRIES; retry++) {
            if (retry > 0) {
                console.log(`\n🔄 Retry ${retry}/${CONFIG.MAX_RETRIES - 1}: Re-querying for more products...`);
                // Add delay between retries
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
            }
            
            console.log('🚀 Using intelligent data layer...');
            const gatheredProducts = await gatherTopProducts(niche);
            
            // Merge with existing products (avoiding duplicates by ASIN)
            const existingAsins = new Set(products.map(p => p.asin));
            const newProducts = gatheredProducts.filter(p => !existingAsins.has(p.asin));
            products.push(...newProducts);
            
            // Apply filtering with multi-tier selection and deduplication
            const filterResult = applyFilters(products, {
                TARGET_COUNT: CONFIG.TARGET_COUNT,
                MIN_ACCEPTABLE: CONFIG.MIN_ACCEPTABLE
            });
            filteredProducts = filterResult.products;
            
            console.log(`🔥 Filtered products ready: ${filteredProducts.length}`);
            console.log(`📊 Stats: gathered=${filterResult.stats.gathered}, validated=${filterResult.stats.validated}, tierA=${filterResult.stats.tierA}, final=${filterResult.stats.final}`);
            
            // If we have enough products, break out of retry loop
            if (filteredProducts.length >= CONFIG.MIN_PRODUCTS) {
                console.log(`✅ Got ${filteredProducts.length} products (target: ${CONFIG.MIN_PRODUCTS})`);
                break;
            }
            
            if (retry < CONFIG.MAX_RETRIES - 1) {
                console.log(`⚠️  Only ${filteredProducts.length} products found, will retry...`);
            }
        }
        
        // Limit to top 12 for API detail fetching (allows some to fail and still get 10)
        filteredProducts = filteredProducts.slice(0, 12);
        
        // Save gathered products to data directory
        fs.writeFileSync(dataFile, JSON.stringify(products, null, 2));
        console.log(`💾 Saved gathered products to: ${dataFile}`);
        
        console.log(`📦 Gathered ${products.length} products from multiple sources`);
        
        if (filteredProducts.length === 0) {
            console.error(`❌ ERROR: No products gathered for "${niche}"`);
            // Return empty array so the caller will generate an empty-results page and continue
            return [];
        }
        
        // Process and validate products, limit to top 10
        const validProducts = [];
        let skippedCount = 0;
        
        for (let i = 0; i < filteredProducts.length; i++) {
            const product = filteredProducts[i];
            
            console.log(`\n📦 Processing product ${i + 1}...`);
            
            // Step 1: Extract ASIN from gathered results (REQUIRED)
            const asin = product.asin || product.ASIN || null;
            
            if (!asin) {
                console.warn(`⚠️  Skipping product ${i + 1}: missing ASIN`);
                skippedCount++;
                continue;
            }
            
            // Step 2: Fetch product details from /product_details/ endpoint
            const details = await fetchProductDetails(asin);
            
            if (!details) {
                console.warn(`⚠️  Skipping product ${i + 1}: failed to fetch product details for ASIN ${asin}`);
                skippedCount++;
                continue;
            }
            
            // Step 3: Extract and merge data from details (with fallbacks to search data)
            
            // Title - REQUIRED (prefer details, fallback to search)
            const title = details.title || details.product_title || details.name || 
                         product.title || product.product_title || product.name || null;
            
            if (!title) {
                console.warn(`⚠️  Skipping product ${i + 1}: missing title for ASIN ${asin}`);
                skippedCount++;
                continue;
            }
            
            // Image - REQUIRED (prefer details, fallback to search)
            let image = details.image_url || details.image || details.product_photo || 
                       details.main_image || details.product_main_image_url || null;
            
            // Try images array from details
            if (!image && details.images && Array.isArray(details.images) && details.images.length > 0) {
                image = details.images[0];
            }
            
            // Fallback to search data
            if (!image) {
                image = product.image_url || product.image || product.product_photo || 
                       product.main_image || product.product_main_image_url || null;
                
                if (!image && product.images && Array.isArray(product.images) && product.images.length > 0) {
                    image = product.images[0];
                }
            }
            
            // Validate image URL
            if (image && !image.startsWith('http')) {
                image = null;
            }
            
            if (!image) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": missing image for ASIN ${asin}`);
                skippedCount++;
                continue;
            }
            
            // Price - SOFT FIELD (prefer details, fallback to search, allow null)
            let price = null;
            
            // Try details first
            if (typeof details.price === 'number') {
                price = `$${details.price.toFixed(2)}`;
            } else if (details.price) {
                price = String(details.price);
            } else if (details.product_price) {
                price = String(details.product_price);
            }
            
            // Fallback to search data
            if (!price) {
                if (typeof product.price === 'number') {
                    price = `$${product.price.toFixed(2)}`;
                } else if (product.price) {
                    price = String(product.price);
                } else if (product.product_price) {
                    price = String(product.product_price);
                }
            }
            
            // Allow null price - template will show "See price on Amazon"
            if (!price) {
                console.log(`  ℹ️  No price found, will show "See price on Amazon"`);
            }
            
            // Description - SOFT FIELD (prefer details, fallback to short_description or features, allow empty string)
            let description = details.description || details.product_description || 
                            details.short_description || null;
            
            // Fallback to search data
            if (!description) {
                description = product.description || product.product_description || 
                            product.short_description || null;
            }
            
            // If still no description, try to create from feature bullets
            if (!description) {
                const tempFeatures = details.features || details.feature_bullets || 
                                   details.about_product || product.features || 
                                   product.feature_bullets || product.about_product || null;
                
                if (tempFeatures && Array.isArray(tempFeatures) && tempFeatures.length > 0) {
                    description = tempFeatures.slice(0, 3).join('. ') + '.';
                }
            }
            
            // Allow empty description as safe default
            if (!description) {
                description = "";
                console.log(`  ℹ️  No description found, using empty string`);
            }
            
            // Rating - SOFT FIELD (default to null if missing)
            let rating = null;
            
            // Try details first
            if (typeof details.rating === 'number') {
                rating = String(details.rating);
            } else if (details.product_star_rating) {
                rating = String(details.product_star_rating);
            } else if (details.stars) {
                rating = String(details.stars);
            }
            
            // Fallback to search data
            if (!rating) {
                if (typeof product.rating === 'number') {
                    rating = String(product.rating);
                } else if (product.product_star_rating) {
                    rating = String(product.product_star_rating);
                } else if (product.stars) {
                    rating = String(product.stars);
                }
            }
            
            // Default to null if still missing (per requirements)
            if (!rating) {
                rating = null;
                console.log(`  ℹ️  No rating found, using null`);
            }
            
            // Review Count - SOFT FIELD (default to null if missing)
            let reviews = null;
            
            // Try details first
            if (details.review_count) {
                reviews = String(details.review_count);
            } else if (details.product_num_ratings) {
                reviews = String(details.product_num_ratings);
            } else if (details.reviews_count) {
                reviews = String(details.reviews_count);
            } else if (details.num_ratings) {
                reviews = String(details.num_ratings);
            }
            
            // Fallback to search data
            if (!reviews) {
                if (product.review_count) {
                    reviews = String(product.review_count);
                } else if (product.product_num_ratings) {
                    reviews = String(product.product_num_ratings);
                } else if (product.reviews_count) {
                    reviews = String(product.reviews_count);
                } else if (product.num_ratings) {
                    reviews = String(product.num_ratings);
                }
            }
            
            // Default to null if still missing (per requirements)
            if (!reviews) {
                reviews = null;
                console.log(`  ℹ️  No review count found, using null`);
            }
            
            // REMOVED: Skip products without a recognizable brand name (generic products)
            // This check is too strict and redundant with the multi-tier filtering above
            // The applyFilters() already filters by premium/reputable brands, so this is unnecessary
            // if (!hasBrandName(title)) {
            //     console.warn(`⚠️  Skipping product ${i + 1} "${title}": no recognizable brand name (generic product)`);
            //     skippedCount++;
            //     continue;
            // }
            
            // Feature bullets - try to extract, generate from description as fallback
            let featureBullets = details.features || details.feature_bullets || 
                               details.about_product || product.features || 
                               product.feature_bullets || product.about_product || null;
            
            if (!featureBullets || !Array.isArray(featureBullets) || featureBullets.length === 0) {
                // Generate from description as fallback
                const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
                featureBullets = sentences.slice(0, 5).map(s => s.trim());
                console.log(`  ℹ️  Generated ${featureBullets.length} features from description`);
            }
            
            const features = featureBullets.slice(0, 5);
            
            // Build Amazon URL
            let amazonUrl = details.detail_page_url || details.product_url || details.url || 
                          product.detail_page_url || product.product_url || product.url || 
                          `https://www.amazon.com/dp/${asin}`;
            
            // Validate URL format
            if (!amazonUrl.startsWith('http')) {
                amazonUrl = `https://www.amazon.com/dp/${asin}`;
            }
            
            // Ensure affiliate tag is added
            if (!amazonUrl.includes('tag=')) {
                const separator = amazonUrl.includes('?') ? '&' : '?';
                amazonUrl = `${amazonUrl}${separator}tag=${CONFIG.AMAZON_AFFILIATE_ID}`;
            }
            
            // Extract pros - try API first, then generate from features as fallback
            let pros = extractPros(details, niche) || extractPros(product, niche);
            
            if (!pros || pros.length === 0) {
                // Generate from features as fallback
                pros = features.slice(0, 3);
                console.log(`  ℹ️  Generated ${pros.length} pros from features`);
            }
            
            // Extract cons - try API first, then generate generic cons as fallback
            let cons = extractCons(details, niche) || extractCons(product, niche);
            
            if (!cons || cons.length === 0) {
                // Generate generic cons as fallback
                cons = ['May vary by individual preferences', 'Check compatibility before purchase'];
                console.log(`  ℹ️  Generated ${cons.length} generic cons`);
            }
            
            console.log(`  ✅ Product validated: "${title}"`);
            
            validProducts.push({
                asin: asin,
                title: title,
                description: description,
                rating: rating,
                reviews: reviews,
                price: price,
                image: image,
                url: amazonUrl,
                features: features,
                pros: pros,
                cons: cons
            });
            
            // Stop once we have 10 valid products
            if (validProducts.length >= 10) {
                break;
            }
            
            // Rate limiting: Small delay between product_details API calls
            if (i < filteredProducts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
            }
        }
        
        console.log(`✅ Successfully validated ${validProducts.length} products with real API data`);
        if (skippedCount > 0) {
            console.log(`⚠️  Skipped ${skippedCount} products due to missing fields`);
        }
        
        // Check if we need RapidAPI fallback (based on post-validation count)
        if (validProducts.length < CONFIG.MIN_ACCEPTABLE) {
            console.log(`\n🔄 Post-validation count (${validProducts.length}) < MIN_ACCEPTABLE (${CONFIG.MIN_ACCEPTABLE})`);
            console.log(`🔄 Triggering RapidAPI fallback to get more products...`);
            
            try {
                const { rapidApiFallback } = require('./api-fallback');
                const backupProducts = await rapidApiFallback(niche);
                console.log(`✓ RapidAPI Fallback: ${backupProducts.length} products retrieved`);
                
                if (backupProducts.length > 0) {
                    // Merge with existing products
                    const existingAsins = new Set(products.map(p => p.asin));
                    const newBackupProducts = backupProducts.filter(p => !existingAsins.has(p.asin));
                    products.push(...newBackupProducts);
                    
                    // Re-run filtering with merged data
                    const reFilterResult = applyFilters(products, {
                        TARGET_COUNT: CONFIG.TARGET_COUNT,
                        MIN_ACCEPTABLE: CONFIG.MIN_ACCEPTABLE
                    });
                    const reFilteredProducts = reFilterResult.products.slice(0, 12);
                    
                    console.log(`✓ Re-filtered after fallback: ${reFilteredProducts.length} products`);
                    
                    // Validate new products
                    for (let i = filteredProducts.length; i < reFilteredProducts.length && validProducts.length < CONFIG.TARGET_COUNT; i++) {
                        const product = reFilteredProducts[i];
                        
                        console.log(`\n📦 Processing fallback product ${i + 1}...`);
                        
                        const asin = product.asin || product.ASIN || null;
                        if (!asin) continue;
                        
                        const details = await fetchProductDetails(asin);
                        if (!details) continue;
                        
                        const title = details.title || details.product_title || details.name || 
                                     product.title || product.product_title || product.name || null;
                        if (!title) continue;
                        
                        let image = details.image_url || details.image || details.product_photo || 
                                   details.main_image || details.product_main_image_url || null;
                        if (!image && details.images && Array.isArray(details.images) && details.images.length > 0) {
                            image = details.images[0];
                        }
                        if (!image) {
                            image = product.image_url || product.image || product.product_photo || 
                                   product.main_image || product.product_main_image_url || null;
                            if (!image && product.images && Array.isArray(product.images) && product.images.length > 0) {
                                image = product.images[0];
                            }
                        }
                        if (image && !image.startsWith('http')) {
                            image = null;
                        }
                        if (!image) continue;
                        
                        let price = null;
                        if (typeof details.price === 'number') {
                            price = `$${details.price.toFixed(2)}`;
                        } else if (details.price) {
                            price = String(details.price);
                        } else if (details.product_price) {
                            price = String(details.product_price);
                        }
                        if (!price) {
                            if (typeof product.price === 'number') {
                                price = `$${product.price.toFixed(2)}`;
                            } else if (product.price) {
                                price = String(product.price);
                            } else if (product.product_price) {
                                price = String(product.product_price);
                            }
                        }
                        
                        let description = details.description || details.product_description || 
                                        details.short_description || null;
                        if (!description) {
                            description = product.description || product.product_description || 
                                        product.short_description || null;
                        }
                        if (!description) {
                            const tempFeatures = details.features || details.feature_bullets || 
                                               details.about_product || product.features || 
                                               product.feature_bullets || product.about_product || null;
                            if (tempFeatures && Array.isArray(tempFeatures) && tempFeatures.length > 0) {
                                description = tempFeatures.slice(0, 3).join('. ') + '.';
                            }
                        }
                        if (!description) {
                            description = "";
                        }
                        
                        let rating = null;
                        if (typeof details.rating === 'number') {
                            rating = String(details.rating);
                        } else if (details.product_star_rating) {
                            rating = String(details.product_star_rating);
                        } else if (details.stars) {
                            rating = String(details.stars);
                        }
                        if (!rating) {
                            if (typeof product.rating === 'number') {
                                rating = String(product.rating);
                            } else if (product.product_star_rating) {
                                rating = String(product.product_star_rating);
                            } else if (product.stars) {
                                rating = String(product.stars);
                            }
                        }
                        
                        let reviews = null;
                        if (details.review_count) {
                            reviews = String(details.review_count);
                        } else if (details.product_num_ratings) {
                            reviews = String(details.product_num_ratings);
                        } else if (details.reviews_count) {
                            reviews = String(details.reviews_count);
                        } else if (details.num_ratings) {
                            reviews = String(details.num_ratings);
                        }
                        if (!reviews) {
                            if (product.review_count) {
                                reviews = String(product.review_count);
                            } else if (product.product_num_ratings) {
                                reviews = String(product.product_num_ratings);
                            } else if (product.reviews_count) {
                                reviews = String(product.reviews_count);
                            } else if (product.num_ratings) {
                                reviews = String(product.num_ratings);
                            }
                        }
                        
                        let featureBullets = details.features || details.feature_bullets || 
                                           details.about_product || product.features || 
                                           product.feature_bullets || product.about_product || null;
                        if (!featureBullets || !Array.isArray(featureBullets) || featureBullets.length === 0) {
                            const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
                            featureBullets = sentences.slice(0, 5).map(s => s.trim());
                        }
                        const features = featureBullets.slice(0, 5);
                        
                        let amazonUrl = details.detail_page_url || details.product_url || details.url || 
                                      product.detail_page_url || product.product_url || product.url || 
                                      `https://www.amazon.com/dp/${asin}`;
                        if (!amazonUrl.startsWith('http')) {
                            amazonUrl = `https://www.amazon.com/dp/${asin}`;
                        }
                        if (!amazonUrl.includes('tag=')) {
                            const separator = amazonUrl.includes('?') ? '&' : '?';
                            amazonUrl = `${amazonUrl}${separator}tag=${CONFIG.AMAZON_AFFILIATE_ID}`;
                        }
                        
                        let pros = extractPros(details, niche) || extractPros(product, niche);
                        if (!pros || pros.length === 0) {
                            pros = features.slice(0, 3);
                        }
                        
                        let cons = extractCons(details, niche) || extractCons(product, niche);
                        if (!cons || cons.length === 0) {
                            cons = ['May vary by individual preferences', 'Check compatibility before purchase'];
                        }
                        
                        console.log(`  ✅ Fallback product validated: "${title}"`);
                        
                        validProducts.push({
                            asin: asin,
                            title: title,
                            description: description,
                            rating: rating,
                            reviews: reviews,
                            price: price,
                            image: image,
                            url: amazonUrl,
                            features: features,
                            pros: pros,
                            cons: cons
                        });
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                    console.log(`✅ After RapidAPI fallback: ${validProducts.length} validated products`);
                }
            } catch (fallbackError) {
                console.error(`⚠️  RapidAPI fallback failed: ${fallbackError.message}`);
            }
        }
        
        // Graceful degradation: Generate site with what we have if < MIN_ACCEPTABLE
        if (validProducts.length < CONFIG.MIN_ACCEPTABLE && validProducts.length > 0) {
            console.warn(`\n⚠️  WARNING: Only ${validProducts.length} products (< MIN_ACCEPTABLE: ${CONFIG.MIN_ACCEPTABLE})`);
            console.warn(`⚠️  Generating site with available products and graceful notice`);
        }
        
        if (validProducts.length === 0) {
            console.warn('⚠️  WARNING: No valid products after validation');
            console.warn('⚠️  Will generate empty-results page for this niche');
            return []; // Return empty array instead of throwing error
        }
        
        // Final log message
        console.log(`\n✅ Final: ${validProducts.length}/10 valid unique products ready for site generation`);
        
        // Return validated products (already filtered by applyFilters earlier)
        return validProducts;
        
    } catch (error) {
        // Log error details and fail
        console.error(`\n${'='.repeat(60)}`);
        console.error('❌ API REQUEST FAILED');
        console.error('='.repeat(60));
        console.error(`Error Type: ${error.name}`);
        console.error(`Error Message: ${error.message}`);
        
        if (error.response) {
            console.error(`\n📡 API Response Details:`);
            console.error(`Status: ${error.response.status} ${error.response.statusText}`);
            console.error(`Headers:`, JSON.stringify(error.response.headers, null, 2));
            console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error(`\n📡 No response received from API`);
            console.error(`Request details:`, error.request);
        }
        
        console.error('='.repeat(60));
        console.error('❌ STOPPING: Cannot proceed without real API data');
        console.error('❌ DO NOT generate mock or dummy data');
        console.error('='.repeat(60) + '\n');
        
        // Re-throw to stop the workflow
        throw error;
    }
}

/**
 * Extract pros from product data - API data only, no fallback generation
 * @param {object} product - Product object
 * @param {string} niche - Niche name for error messages
 * @returns {Array} Pros array (empty if not in API)
 */
function extractPros(product, niche) {
    // Only extract pros from API data - no generation
    if (product.pros && Array.isArray(product.pros) && product.pros.length > 0) {
        return product.pros.slice(0, 5);
    }
    
    if (product.positives && Array.isArray(product.positives) && product.positives.length > 0) {
        return product.positives.slice(0, 5);
    }
    
    // Return empty array if no pros in API response
    return [];
}

/**
 * Extract cons from product data - API data only, no fallback generation
 * @param {object} product - Product object
 * @param {string} niche - Niche name for error messages
 * @returns {Array} Cons array (empty if not in API)
 */
function extractCons(product, niche) {
    // Only extract cons from API data - no generation
    if (product.cons && Array.isArray(product.cons) && product.cons.length > 0) {
        return product.cons.slice(0, 3);
    }
    
    if (product.negatives && Array.isArray(product.negatives) && product.negatives.length > 0) {
        return product.negatives.slice(0, 3);
    }
    
    // Return empty array if no cons in API response
    return [];
}

/**
 * Load all templates
 * @returns {object} Templates object
 */
function loadTemplates() {
    return {
        mainTemplate: fs.readFileSync(path.join(CONFIG.TEMPLATES_DIR, 'template.html'), 'utf-8'),
        templateJSON: JSON.parse(fs.readFileSync(path.join(CONFIG.TEMPLATES_DIR, 'template.json'), 'utf-8')),
        productTemplate: fs.readFileSync(path.join(CONFIG.TEMPLATES_DIR, 'product-template.html'), 'utf-8'),
        blogTemplate: fs.readFileSync(path.join(CONFIG.TEMPLATES_DIR, 'blog-template.html'), 'utf-8')
    };
}

/**
 * Generate SEO content using the new writers module
 * @param {string} niche - Niche name
 * @param {Array} products - Products array
 * @returns {object} SEO content object
 */
function generateSEOContent(niche, products) {
    // Use new writers module for intro and buyers guide (with product data)
    const { generateIntro } = require('./writers/intro-writer');
    const { generateBuyersGuide: writeBuyersGuide } = require('./writers/buyers-guide-writer');
    const { generateFAQ: writeFAQ } = require('./writers/faq-writer');
    const { generateCTA: writeCTA } = require('./writers/cta-writer');
    
    const faqResult = writeFAQ(niche, products);
    
    return {
        intro: generateIntro(niche, products),
        buyersGuide: writeBuyersGuide(niche, products),
        faq: faqResult.html,
        faqStructuredData: faqResult.schema,
        cta: writeCTA(niche)
    };
}

/**
 * Generate a human-sounding mini-review for a product
 * @param {object} product - Product object
 * @param {number} rank - Product rank
 * @param {string} niche - Niche name
 * @returns {string} Mini-review text
 */
function generateMiniReview(product, rank, niche) {
    const text = `${product.title} ${product.description} ${Array.isArray(product.features) ? product.features.join(' ') : ''}`.toLowerCase();
    const price = parseFloat((product.price || '').replace(/[^0-9.]/g, '')) || 0;
    const rating = parseFloat(product.rating || 0) || 0;
    
    // Generate contextual mini-reviews based on product characteristics
    const reviews = {
        bestOverall: [
            "An outstanding all-around choice that excels in performance, features, and value.",
            "The top pick for most people, combining excellent quality with practical features.",
            "A standout performer that delivers on all fronts with consistently high ratings."
        ],
        premium: [
            "Premium quality for those who want the best performance and features available.",
            "High-end option with advanced features and superior build quality.",
            "Professional-grade choice for serious enthusiasts who demand the best."
        ],
        budget: [
            "Excellent value for money without compromising on essential features.",
            "Budget-friendly pick that delivers solid performance at an affordable price.",
            "Great entry-level option that punches above its price point."
        ],
        highRating: [
            "Consistently praised by thousands of users for reliability and performance.",
            "Customer favorite with exceptional reviews from real-world users.",
            "Highly rated by buyers who appreciate its quality and value."
        ]
    };
    
    // Determine which type of review to use
    if (rank === 1) {
        return reviews.bestOverall[Math.floor(Math.random() * reviews.bestOverall.length)];
    } else if (price > 150) {
        return reviews.premium[Math.floor(Math.random() * reviews.premium.length)];
    } else if (price < 50) {
        return reviews.budget[Math.floor(Math.random() * reviews.budget.length)];
    } else if (rating >= 4.5) {
        return reviews.highRating[Math.floor(Math.random() * reviews.highRating.length)];
    }
    
    // Default reviews for mid-range products
    const defaultReviews = [
        "Solid all-around performer with features that meet most users' needs.",
        "Well-balanced option offering good performance at a reasonable price.",
        "Popular choice among buyers looking for reliable everyday performance."
    ];
    
    return defaultReviews[Math.floor(Math.random() * defaultReviews.length)];
}


/**
 * Generate products HTML
 * @param {Array} products - Products array
 * @param {string} template - Product template HTML
 * @param {string} niche - Niche name
 * @returns {string} Products HTML
 */
function generateProductsHTML(products, template, niche) {
    // Tier 1.1: Deduplicate products by ASIN before rendering
    const seenAsins = new Set();
    const deduplicatedProducts = products.filter(product => {
        if (seenAsins.has(product.asin)) {
            console.log(`  ⚠️  Skipping duplicate ASIN: ${product.asin}`);
            return false;
        }
        seenAsins.add(product.asin);
        return true;
    });
    
    if (deduplicatedProducts.length < products.length) {
        console.log(`✓ Tier 1.1: Deduplicated ${products.length - deduplicatedProducts.length} products`);
    }
    
    return deduplicatedProducts.map((product, index) => {
        const rank = index + 1;
        const badge = rank === 1 ? '<span class="badge-best">Best Overall</span>' : 
                     rank === 2 ? '<span class="badge-value">Best Value</span>' : '';
        
        // Extract short product name for display
        const shortName = extractShortProductName(product.title);
        
        // Detect product categories
        const categories = detectProductCategories(product, niche);
        
        // Generate product highlights
        const highlights = generateProductHighlights(product, niche);
        
        // Generate mini-review summary
        const miniReview = generateMiniReview(product, rank, niche);
        
        let html = template;
        html = html.replace(/{{RANK}}/g, rank);
        html = html.replace(/{{BADGE}}/g, badge);
        html = html.replace(/{{CATEGORIES}}/g, categories.join(' '));
        html = html.replace(/{{IMAGE_URL}}/g, product.image);
        html = html.replace(/{{PRODUCT_TITLE}}/g, escapeHtml(shortName));
        html = html.replace(/{{MINI_REVIEW}}/g, miniReview);
        html = html.replace(/{{RATING_STARS}}/g, generateStars(parseFloat(product.rating || 0)));
        html = html.replace(/{{RATING}}/g, product.rating || 'N/A');
        html = html.replace(/{{REVIEW_COUNT}}/g, product.reviews || '0');
        html = html.replace(/{{PRICE}}/g, product.price || 'See on Amazon');
        html = html.replace(/{{HIGHLIGHTS}}/g, highlights);
        const features = Array.isArray(product.features) ? product.features : [];
        html = html.replace(/{{FEATURES_LIST}}/g, generateListItems(features.slice(0, 5)));
        html = html.replace(/{{AFFILIATE_LINK}}/g, generateAffiliateLink(product));
        html = html.replace(/{{ASIN}}/g, product.asin);
        
        return html;
    }).join('\n\n');
}

/**
 * Detect product categories based on title, description, and features
 * @param {object} product - Product object
 * @param {string} niche - Niche name
 * @returns {Array} Array of category strings
 */
function detectProductCategories(product, niche) {
    const categories = [];
    const text = `${product.title} ${product.description} ${product.features.join(' ')}`.toLowerCase();
    const price = parseFloat((product.price || '').replace(/[^0-9.]/g, '')) || 0;
    
    // Premium category (high-end brands or price > $100)
    const premiumBrands = ['sony', 'bose', 'apple', 'sennheiser', 'bang & olufsen', 'beats studio'];
    if (price > 100 || premiumBrands.some(brand => text.includes(brand))) {
        categories.push('premium');
    }
    
    // Budget category (price < $50)
    if (price < 50) {
        categories.push('budget');
    }
    
    // Gym/Workout category
    const gymKeywords = ['gym', 'workout', 'sport', 'sweat', 'water-resistant', 'waterproof', 'ipx', 'fitness', 'running', 'exercise'];
    if (gymKeywords.some(kw => text.includes(kw))) {
        categories.push('gym');
    }
    
    // Travel category
    const travelKeywords = ['travel', 'airplane', 'flight', 'portable', 'foldable', 'compact', 'carrying case'];
    if (travelKeywords.some(kw => text.includes(kw))) {
        categories.push('travel');
    }
    
    // Work category
    const workKeywords = ['office', 'work', 'calls', 'microphone', 'conference', 'zoom', 'teams', 'business', 'professional'];
    if (workKeywords.some(kw => text.includes(kw))) {
        categories.push('work');
    }
    
    // Gaming category
    const gamingKeywords = ['gaming', 'game', 'gamer', 'low latency', 'surround sound', 'rgb', 'playstation', 'xbox'];
    if (gamingKeywords.some(kw => text.includes(kw))) {
        categories.push('gaming');
    }
    
    return categories;
}

/**
 * Generate product highlights HTML
 * @param {object} product - Product object
 * @param {string} niche - Niche name
 * @returns {string} Highlights HTML
 */
function generateProductHighlights(product, niche) {
    const highlights = [];
    const features = Array.isArray(product.features) ? product.features : [];
    const text = `${product.title} ${product.description} ${features.join(' ')}`.toLowerCase();
    const specs = extractProductSpecs(product);
    
    // Price - always show (or "See on Amazon" if null)
    highlights.push({
        icon: '💰',
        label: 'Price',
        value: product.price || 'See on Amazon'
    });
    
    // Rating - always show with review count
    const rating = product.rating || 'N/A';
    const reviewCount = product.reviews || '0';
    const ratingValue = rating === 'N/A' ? 'Not yet rated' : `${rating} / 5 (${reviewCount} reviews)`;
    highlights.push({
        icon: '⭐',
        label: 'Rating',
        value: ratingValue
    });
    
    // Battery - if available
    if (specs.battery) {
        highlights.push({
            icon: '🔋',
            label: 'Battery',
            value: specs.battery
        });
    }
    

    
    // Driver Size - if available
    if (specs.driver) {
        highlights.push({
            icon: '🔊',
            label: 'Driver Size',
            value: specs.driver
        });
    }
    
    // Generate HTML for highlights
    return highlights.map(h => `
            <div class="highlight-item">
                <span class="highlight-icon">${h.icon}</span>
                <span class="highlight-label">${h.label}</span>
                <span class="highlight-value">${escapeHtml(h.value)}</span>
            </div>`).join('');
}

/**
 * Detect best use case for product
 * @param {string} text - Combined product text
 * @returns {string|null} Best use case or null
 */
function detectBestFor(text) {
    if (text.includes('gym') || text.includes('workout') || text.includes('sport') || text.includes('running')) {
        return 'Workouts';
    }
    if (text.includes('travel') || text.includes('airplane') || text.includes('flight')) {
        return 'Travel';
    }
    if (text.includes('gaming') || text.includes('game')) {
        return 'Gaming';
    }
    if (text.includes('office') || text.includes('work') || text.includes('calls') || text.includes('conference')) {
        return 'Work/Calls';
    }
    if (text.includes('bass') || text.includes('audiophile') || text.includes('hi-res') || text.includes('lossless')) {
        return 'Music Lovers';
    }
    if (text.includes('comfort') || text.includes('all-day') || text.includes('lightweight')) {
        return 'All-Day Use';
    }
    if (text.includes('budget') || text.includes('affordable') || text.includes('value')) {
        return 'Budget-Friendly';
    }
    return null;
}

/**
 * Generate stars HTML
 * @param {number} rating - Rating value
 * @returns {string} Stars HTML
 */
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + 
           (halfStar ? '⯨' : '') + 
           '☆'.repeat(emptyStars);
}

/**
 * Generate list items HTML
 * @param {Array} items - Items array
 * @returns {string} List items HTML
 */
function generateListItems(items) {
    return items.map(item => `<li>${escapeHtml(item)}</li>`).join('\n                    ');
}

/**
 * Generate affiliate link
 * @param {object} product - Product object
 * @returns {string} Affiliate link
 */
function generateAffiliateLink(product) {
    // Always use the standard Amazon format with ASIN
    // This ensures links work correctly and include the affiliate tag
    return `https://www.amazon.com/dp/${product.asin}?tag=${CONFIG.AMAZON_AFFILIATE_ID}`;
}

/**
 * Generate index.html
 * @param {string} niche - Niche name
 * @param {string} slug - URL slug
 * @param {object} templates - Templates object
 * @param {object} seoContent - SEO content object
 * @param {string} productsHTML - Products HTML
 * @param {Array} products - Products array
 * @returns {string} Complete HTML
 */
function generateIndexHTML(niche, slug, templates, seoContent, productsHTML, products) {
    const templateData = templates.templateJSON;
    // Tier 2.6: Use ISO date format for last-updated timestamp
    const lastUpdated = process.env.UPDATE_TIMESTAMP || new Date().toISOString().split('T')[0];
    // Get current year dynamically
    const currentYear = new Date().getFullYear();
    
    // Format niche name with proper capitalization
    const formattedNiche = formatNicheName(niche);
    
    // Generate structured data
    const structuredData = generateStructuredData(formattedNiche, slug, products);
    
    // Generate comparison table
    const comparisonTable = generateComparisonTable(products);
    
    // Generate FAQ structured data as script tag
    const faqStructuredDataScript = `<script type="application/ld+json">
    ${JSON.stringify(seoContent.faqStructuredData, null, 2)}
    </script>`;
    
    // Get top product link for sticky CTA
    const topProductLink = products.length > 0 ? generateAffiliateLink(products[0]) : '#';
    
    let html = templates.mainTemplate;
    
    // Replace all placeholders - process YEAR and NICHE in template data first
    html = html.replace(/{{TITLE}}/g, templateData.title.replace(/{{NICHE}}/g, formattedNiche).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{META_DESCRIPTION}}/g, templateData.meta_description.replace(/{{NICHE}}/g, formattedNiche).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{META_KEYWORDS}}/g, templateData.meta_keywords.replace(/{{NICHE}}/g, niche.toLowerCase()).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{NICHE}}/g, formattedNiche);
    html = html.replace(/{{HERO_TITLE}}/g, templateData.sections.hero_title.replace(/{{NICHE}}/g, formattedNiche).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{INTRO_TITLE}}/g, templateData.sections.intro_title.replace(/{{NICHE}}/g, formattedNiche).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{INTRO_PARAGRAPH}}/g, seoContent.intro);
    html = html.replace(/{{COMPARISON_TABLE}}/g, comparisonTable);
    html = html.replace(/{{PRODUCTS_SECTION_TITLE}}/g, templateData.sections.products_section_title.replace(/{{NICHE}}/g, formattedNiche).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{PRODUCTS_LIST}}/g, productsHTML);
    html = html.replace(/{{BUYERS_GUIDE_TITLE}}/g, templateData.sections.buyers_guide_title.replace(/{{NICHE}}/g, formattedNiche).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{BUYERS_GUIDE_CONTENT}}/g, seoContent.buyersGuide);
    html = html.replace(/{{FAQ_TITLE}}/g, templateData.sections.faq_title.replace(/{{NICHE}}/g, formattedNiche).replace(/{{YEAR}}/g, currentYear));
    html = html.replace(/{{FAQ_CONTENT}}/g, seoContent.faq);
    html = html.replace(/{{FAQ_STRUCTURED_DATA}}/g, faqStructuredDataScript);
    html = html.replace(/{{CTA_CONTENT}}/g, seoContent.cta);
    html = html.replace(/{{LAST_UPDATED}}/g, lastUpdated);
    html = html.replace(/{{STRUCTURED_DATA}}/g, JSON.stringify(structuredData, null, 2));
    html = html.replace(/{{BASE_URL}}/g, CONFIG.BASE_URL);
    html = html.replace(/{{PAGE_URL}}/g, `${CONFIG.BASE_URL}/${slug}/`);
    html = html.replace(/{{TOP_PRODUCT_LINK}}/g, topProductLink);
    
    return html;
}

/**
 * Generate structured data for products
 * @param {string} niche - Niche name
 * @param {string} slug - URL slug
 * @param {Array} products - Products array
 * @returns {object} Structured data object
 */
function generateStructuredData(niche, slug, products) {
    const currentYear = new Date().getFullYear();
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `Best ${niche} (${currentYear})`,
        "description": `The best ${niche.toLowerCase()} available in ${currentYear}, ranked and reviewed`,
        "itemListElement": products.map((product, index) => {
            const item = {
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Product",
                    "name": product.title,
                    "image": product.image,
                    "description": product.description || "",
                    "offers": {
                        "@type": "Offer",
                        "priceCurrency": "USD",
                        "availability": "https://schema.org/InStock",
                        "url": generateAffiliateLink(product)
                    }
                }
            };
            
            // Only add aggregateRating if we have valid rating data
            if (product.rating && product.reviews) {
                item.item.aggregateRating = {
                    "@type": "AggregateRating",
                    "ratingValue": product.rating,
                    "reviewCount": product.reviews
                };
            }
            
            // Only add price if available
            if (product.price) {
                item.item.offers.price = product.price.replace(/[^0-9.]/g, '');
            }
            
            return item;
        })
    };
}

/**
 * Generate blog HTML for a product
 * @param {object} product - Product object
 * @param {string} niche - Niche name
 * @param {number} rank - Product rank
 * @param {object} templates - Templates object
 * @returns {string} Blog HTML
 */
function generateBlogHTML(product, niche, rank, templates) {
    // Use new blog writer module
    const { writeBlogContent } = require('./writers/blog-writer');
    const blog = writeBlogContent(product, niche, rank);
    const publishDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Extract short product name
    const shortName = extractShortProductName(product.title);
    
    // Generate product schema
    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.title,
        "image": product.image,
        "description": product.description || "",
        "offers": {
            "@type": "Offer",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": generateAffiliateLink(product)
        }
    };
    
    // Only add aggregateRating if we have valid rating data
    if (product.rating && product.reviews) {
        productSchema.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": product.rating,
            "reviewCount": product.reviews
        };
    }
    
    // Only add price if available
    if (product.price) {
        productSchema.offers.price = product.price.replace(/[^0-9.]/g, '');
    }
    
    let html = templates.blogTemplate;
    html = html.replace(/{{BLOG_TITLE}}/g, escapeHtml(blog.title));
    html = html.replace(/{{BLOG_META_DESCRIPTION}}/g, escapeHtml(blog.metaDescription));
    html = html.replace(/{{PRODUCT_TITLE}}/g, escapeHtml(shortName));
    html = html.replace(/{{PUBLISH_DATE}}/g, publishDate);
    html = html.replace(/{{READING_TIME}}/g, blog.readingTime);
    html = html.replace(/{{IMAGE_URL}}/g, product.image);
    html = html.replace(/{{RATING_STARS}}/g, generateStars(parseFloat(product.rating || 0)));
    html = html.replace(/{{RATING}}/g, product.rating || 'N/A');
    html = html.replace(/{{REVIEW_COUNT}}/g, product.reviews || '0');
    html = html.replace(/{{PRICE}}/g, product.price || 'See on Amazon');
    html = html.replace(/{{BLOG_CONTENT}}/g, blog.content);
    html = html.replace(/{{AFFILIATE_LINK}}/g, generateAffiliateLink(product));
    html = html.replace(/{{PRODUCT_SCHEMA}}/g, JSON.stringify(productSchema, null, 2));
    
    return html;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated text
 */
function truncate(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + '...';
}

/**
 * Check if product has a recognizable brand name
 * Skips products with only generic descriptive text (no brand)
 * @param {string} title - Product title
 * @returns {boolean} True if has brand name, false if generic
 */
function hasBrandName(title) {
    // List of known premium/recognized brands (deduplicated)
    const KNOWN_BRANDS = [
        "Apple", "Sony", "Bose", "Sennheiser", "Bang & Olufsen", "B&O",
        "Shure", "Razer", "Logitech", "Samsung", "JBL", "Beats", "HP", "Dell", "Lenovo",
        "Garmin", "Fitbit", "Fossil", "Skullcandy", "Audio-Technica", "Anker", "Microsoft",
        "LG", "Asus", "Acer", "MSI", "Alienware", "Corsair", "SteelSeries", "HyperX",
        "Jabra", "Plantronics", "Philips", "Panasonic", "TCL", "Hisense", "Vizio",
        "Nintendo", "PlayStation", "Xbox", "Oculus", "Meta", "Google", "Amazon", "Kindle",
        "Bowers & Wilkins", "Master & Dynamic", "Focal", "AKG", "Beyerdynamic",
        "Marshall", "Denon", "Harman Kardon", "KEF", "Klipsch",
        "Soundcore", "1MORE", "Jaybird", "Mpow", "Tozo", "Tribit", "EarFun",
        "Xiaomi", "OnePlus", "Huawei", "Oppo", "Realme", "Nothing", "Motorola",
        "Amazfit", "Withings", "Polar", "Suunto", "Coros", "Mobvoi", "TicWatch",
        "ROG", "Republic of Gamers", "Turtle Beach", "Astro", "EPOS",
        "Dyson", "Roomba", "iRobot", "Ecovacs", "Roborock", "Shark", "Eufy",
        "Canon", "Nikon", "Fujifilm", "GoPro", "DJI", "Insta360", "Olympus"
    ];
    
    // Generic product names that should be rejected (starts with these)
    const GENERIC_NAMES = [
        "Smart Watch", "Smartwatch", "Smart Watches",
        "Wireless Earbuds", "Wireless Headphones", "Bluetooth Headphones",
        "Bluetooth Earbuds", "Earbuds", "Headphones", "Earphones",
        "Fitness Tracker", "Activity Tracker", "Sport Watch",
        "Gaming Headset", "Headset", "TWS",
        "Tablet", "Laptop", "Computer", "PC",
        "TV", "Television", "Monitor", "Display",
        "Camera", "Webcam", "Speaker", "Soundbar",
        "Robot Vacuum", "Vacuum Cleaner", "Smart Home",
        "Watch for Men", "Watch for Women", "Watches for Men", "Watches for Women"
    ];
    
    const titleLower = title.toLowerCase().trim();
    const titleOriginal = title.trim();
    
    // Check if title starts with a generic product name (no brand)
    for (const generic of GENERIC_NAMES) {
        if (titleLower.startsWith(generic.toLowerCase())) {
            console.log(`    📛 Rejecting generic name: "${title}" (starts with "${generic}")`);
            return false;
        }
    }
    
    // Common generic starting patterns that indicate no brand
    const genericPatterns = [
        /^[0-9]+ Pack/i,
        /^[0-9]+ Pcs/i,
        /^[0-9]+ Piece/i,
        /^[0-9]+ Set/i,
        /^[0-9]{3,}/,  // Starting with numbers like "100 Pack"
        // Only block truly generic unbranded products
        /^Generic /i,
        /^Brandless /i,
        /^No Brand /i
    ];
    
    // Check if title starts with generic patterns
    for (const pattern of genericPatterns) {
        if (pattern.test(titleOriginal)) {
            return false;
        }
    }
    
    // Check if title contains a known brand name
    for (const brand of KNOWN_BRANDS) {
        if (titleLower.includes(brand.toLowerCase())) {
            return true;  // Has a recognized brand
        }
    }
    
    // Check if first word is capitalized and looks like a brand name
    // Brand names typically start with capital letters and are at the beginning
    const firstWord = titleOriginal.split(/[\s-]/)[0];
    
    // If starts with lowercase, likely generic description
    if (firstWord.length > 0 && firstWord[0] === firstWord[0].toLowerCase()) {
        return false;
    }
    
    // If no known brand found and first word is generic, reject
    const firstWordLower = firstWord.toLowerCase();
    const genericFirstWords = ['smart', 'wireless', 'bluetooth', 'fitness', 'digital', 'portable', 'mini', 'premium'];
    if (genericFirstWords.includes(firstWordLower)) {
        console.log(`    📛 Rejecting generic name: "${title}" (starts with generic word "${firstWord}")`);
        return false;
    }
    
    // Check minimum length and proper capitalization
    // Brand names are usually 2+ characters and start with uppercase
    if (firstWord.length >= 2 && firstWord[0] === firstWord[0].toUpperCase()) {
        return true;
    }
    
    return false;
}

/**
 * Extract short product name from full Amazon title
 * Extracts brand name and model/short name, e.g., "JBL Tune 720BT" from long title
 * @param {string} fullTitle - Full Amazon product title
 * @returns {string} Short product name
 */
function extractShortProductName(fullTitle) {
    // Common patterns to split on
    const splitPatterns = [
        ' - ',
        ' – ',  // em dash
        ' | ',
        ' with ',
        ' featuring ',
        ', ',
        ' (',
        ' for '
    ];
    
    // Try to find the first natural break point
    let shortName = fullTitle;
    let splitIndex = -1;
    
    for (const pattern of splitPatterns) {
        const index = fullTitle.indexOf(pattern);
        if (index !== -1 && (splitIndex === -1 || index < splitIndex)) {
            splitIndex = index;
        }
    }
    
    if (splitIndex !== -1) {
        shortName = fullTitle.substring(0, splitIndex);
    }
    
    // Clean up and limit length
    shortName = shortName.trim();
    
    // If still too long (more than 50 chars), try to get just brand and model
    if (shortName.length > 50) {
        const words = shortName.split(' ');
        // Take first 3-4 words as they usually contain brand + model
        shortName = words.slice(0, Math.min(4, words.length)).join(' ');
    }
    
    return shortName;
}

/**
 * Generate comparison table HTML
 * @param {Array} products - Products array
 * @returns {string} Comparison table HTML
 */
function generateComparisonTable(products) {
    // Tier 1.5: Generate specs comparison table with Battery, Weight, Driver size
    // Only include columns with at least one non-empty value
    
    // Extract specs from product descriptions and features
    const productSpecs = products.map(product => extractProductSpecs(product));
    
    // Determine which spec columns have data
    const hasWeight = productSpecs.some(s => s.weight);
    const hasBattery = productSpecs.some(s => s.battery);
    const hasDriver = productSpecs.some(s => s.driver);
    
    const tableRows = products.map((product, index) => {
        const rank = index + 1;
        const shortName = extractShortProductName(product.title);
        const cardId = `product-${rank}`;
        const specs = productSpecs[index];
        
        let row = `                <tr>
                    <td class="rank-cell">${rank}</td>
                    <td class="product-name-cell">
                        <a href="#${cardId}" class="product-link">${escapeHtml(shortName)}</a>
                    </td>
                    <td class="rating-cell">${product.rating || 'N/A'} ⭐</td>
                    <td class="reviews-cell">${product.reviews || '0'}</td>
                    <td class="price-cell">${product.price || 'See on Amazon'}</td>`;
        
        if (hasBattery) {
            row += `\n                    <td class="battery-cell">${specs.battery || '-'}</td>`;
        }
        if (hasWeight) {
            row += `\n                    <td class="weight-cell">${specs.weight || '-'}</td>`;
        }
        if (hasDriver) {
            row += `\n                    <td class="driver-cell">${specs.driver || '-'}</td>`;
        }
        
        row += `\n                    <td class="action-cell">
                        <a href="blog/${product.asin}.html" class="btn-table">Review</a>
                    </td>
                </tr>`;
        
        return row;
    }).join('\n');
    
    // Build header with dynamic columns
    let headerRow = `                        <tr>
                            <th>Rank</th>
                            <th>Product</th>
                            <th>Rating</th>
                            <th>Reviews</th>
                            <th>Price</th>`;
    
    if (hasBattery) headerRow += `\n                            <th>Battery</th>`;
    if (hasWeight) headerRow += `\n                            <th>Weight</th>`;
    if (hasDriver) headerRow += `\n                            <th>Driver</th>`;
    
    headerRow += `\n                            <th>Action</th>
                        </tr>`;
    
    return `                <table class="comparison-table">
                    <thead>
${headerRow}
                    </thead>
                    <tbody>
${tableRows}
                    </tbody>
                </table>`;
}

/**
 * Extract product specifications from description and features
 * @param {object} product - Product object
 * @returns {object} Specs object with battery, weight, driver
 */
function extractProductSpecs(product) {
    const text = (product.description + ' ' + product.features.join(' ')).toLowerCase();
    
    const specs = {
        battery: null,
        weight: null,
        driver: null
    };
    
    // Extract battery life (hours)
    const batteryMatch = text.match(/(\d+)\s*(h|hr|hrs|hour|hours)\s*(battery|playtime|play time)/i) ||
                        text.match(/battery[:\s]+(\d+)\s*(h|hr|hrs|hour|hours)/i) ||
                        text.match(/up to\s+(\d+)\s*(h|hr|hrs|hour|hours)/i);
    if (batteryMatch) {
        specs.battery = `${batteryMatch[1]}h`;
    }
    
    // Extract weight (oz, g, lbs)
    const weightMatch = text.match(/(\d+\.?\d*)\s*(oz|ounce|ounces|g|gram|grams|lb|lbs|pound|pounds)/i) ||
                       text.match(/weight[:\s]+(\d+\.?\d*)\s*(oz|ounce|ounces|g|gram|grams|lb|lbs|pound|pounds)/i);
    if (weightMatch) {
        const value = weightMatch[1];
        const unit = weightMatch[2].toLowerCase();
        if (unit.startsWith('oz') || unit.startsWith('ounce')) {
            specs.weight = `${value}oz`;
        } else if (unit.startsWith('g') || unit.startsWith('gram')) {
            specs.weight = `${value}g`;
        } else if (unit.startsWith('lb') || unit.startsWith('pound')) {
            specs.weight = `${value}lb`;
        }
    }
    
    // Extract driver size (mm)
    const driverMatch = text.match(/(\d+)\s*mm\s*(driver|drivers)/i) ||
                       text.match(/driver[s]?[:\s]+(\d+)\s*mm/i);
    if (driverMatch) {
        specs.driver = `${driverMatch[1]}mm`;
    }
    
    return specs;
}

/**
 * Generate README.md content for repository
 * @param {string} niche - Niche name
 * @param {string} slug - URL slug
 * @param {number} productCount - Number of products
 * @returns {string} README content
 */
function generateReadme(niche, slug, productCount) {
    const year = new Date().getFullYear();
    return `# Best ${niche} (${year})

## Overview

This site provides comprehensive reviews and rankings of the best ${niche.toLowerCase()} available in ${year}.

## Features

- ✅ ${productCount} carefully selected products
- ✅ Detailed product reviews and comparisons
- ✅ Real-time pricing and availability from Amazon
- ✅ Expert buyer's guide
- ✅ Frequently asked questions
- ✅ Individual blog posts for each product

## Live Site

View the live site at: https://sc-connections.github.io/Top-10/${slug}/

## Structure

\`\`\`
/
├── index.html          # Main product listing page
├── styles.css          # Site styles
├── README.md           # This file
└── blog/               # Individual product review pages
    ├── [ASIN].html
    └── ...
\`\`\`

## Auto-Generated

This site is automatically generated and updated regularly using the [SC-Connections Top-10 Generator](https://github.com/SC-Connections/Top-10).

## Affiliate Disclosure

This site contains affiliate links. We may earn a commission from qualifying purchases made through these links, at no additional cost to you.

---

*Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*
`;
}

// Run the generator
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main };
