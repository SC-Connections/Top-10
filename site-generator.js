/**
 * Main Site Generator
 * Generates complete niche review sites using Amazon product data
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { generateIntroContent, generateBuyersGuide, generateFAQ, generateFAQStructuredData, generateCTA } = require('./generate-seo');
const { generateBlogArticle } = require('./generate-blog');

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
    LOGS_DIR: path.join(__dirname, 'logs'),
    SRC_DATA_DIR: path.join(__dirname, 'src', 'data'),
    MAX_FEATURE_LENGTH: 150,  // Maximum length for generated feature from description
    MIN_REVIEW_THRESHOLD: 100,  // Rule 5: Minimum review threshold
    NEW_ENTRY_THRESHOLD: 500  // Rule 5: Badge threshold for new entries
};

// Rule 2: Skipped ASINs log
const SKIPPED_ASINS = [];

/**
 * Rule 2: Log skipped ASIN with reason
 * @param {string} asin - Product ASIN
 * @param {string} reason - Reason for skipping
 */
function logSkippedAsin(asin, reason) {
    SKIPPED_ASINS.push({
        asin: asin,
        reason: reason,
        timestamp: new Date().toISOString()
    });
}

/**
 * Rule 2: Save skipped ASINs log to file
 */
function saveSkippedAsinsLog() {
    if (SKIPPED_ASINS.length > 0) {
        const logFile = path.join(CONFIG.LOGS_DIR, 'skipped-asins.json');
        if (!fs.existsSync(CONFIG.LOGS_DIR)) {
            fs.mkdirSync(CONFIG.LOGS_DIR, { recursive: true });
        }
        fs.writeFileSync(logFile, JSON.stringify(SKIPPED_ASINS, null, 2));
        console.log(`\n📝 Saved ${SKIPPED_ASINS.length} skipped ASINs to: ${logFile}`);
    }
}

/**
 * Rule 4: Save products to single source of truth
 * @param {string} niche - Niche name
 * @param {Array} products - Products array
 */
function saveProductsData(niche, products) {
    const productsFile = path.join(CONFIG.SRC_DATA_DIR, 'products.json');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(CONFIG.SRC_DATA_DIR)) {
        fs.mkdirSync(CONFIG.SRC_DATA_DIR, { recursive: true });
    }
    
    // Load existing data or create new
    let allProducts = {};
    if (fs.existsSync(productsFile)) {
        try {
            allProducts = JSON.parse(fs.readFileSync(productsFile, 'utf-8'));
        } catch (error) {
            console.warn('⚠️  Could not read existing products.json, creating new');
        }
    }
    
    // Update with current niche products
    allProducts[niche] = products.map(p => ({
        asin: p.asin,
        title: p.title,
        brand: extractBrandFromTitle(p.title),
        image: p.image,
        price: p.price,
        rating: p.rating,
        reviews: p.reviews,
        battery: p.battery || null,
        weight: p.weight || null,
        driver: p.driver || null,
        description: p.description,
        features: p.features,
        pros: p.pros,
        cons: p.cons,
        url: p.url
    }));
    
    // Save updated data
    fs.writeFileSync(productsFile, JSON.stringify(allProducts, null, 2));
    console.log(`✓ Saved ${products.length} products to ${productsFile}`);
}

/**
 * Extract brand name from product title
 * @param {string} title - Product title
 * @returns {string} Brand name or null
 */
function extractBrandFromTitle(title) {
    // Extract first word/phrase that looks like a brand
    const words = title.trim().split(/[\s-]/);
    if (words.length > 0 && words[0][0] === words[0][0].toUpperCase()) {
        return words[0];
    }
    return null;
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Starting niche site generator...\n');
    
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
    const niches = readNiches();
    console.log(`📋 Found ${niches.length} niches to process\n`);
    
    // Track generated niche URLs for index page
    const generatedNiches = [];
    const failedNiches = [];
    
    // Process each niche
    for (let i = 0; i < niches.length; i++) {
        const niche = niches[i];
        try {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📦 Processing: ${niche}`);
            console.log('='.repeat(60));
            
            const slug = createSlug(niche);
            await generateSiteForNiche(niche);
            
            // All sites are kept in this repository at /{slug}/
            const publicUrl = `${CONFIG.BASE_URL}/${slug}/`;
            
            generatedNiches.push({ niche, slug, url: publicUrl });
            console.log(`✅ Successfully generated site for: ${niche}\n`);
            
            // Rate limiting: Add delay between niches to avoid hitting API rate limits
            if (i < niches.length - 1) {
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
    
    // Save generated niches data for index page generation
    if (generatedNiches.length > 0) {
        const dataFile = path.join(CONFIG.OUTPUT_DIR, '_niches_data.json');
        fs.writeFileSync(dataFile, JSON.stringify(generatedNiches, null, 2));
        console.log(`\n📝 Saved niche data to: ${dataFile}`);
    }
    
    // Report summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully generated: ${generatedNiches.length} sites`);
    console.log(`❌ Failed: ${failedNiches.length} sites`);
    
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
    
    // Rule 2: Save skipped ASINs log
    saveSkippedAsinsLog();
    
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
    
    // Rule 4: Save products to single source of truth
    console.log('💾 Saving products data...');
    saveProductsData(niche, products);
    
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
    
    let html = templates.mainTemplate;
    
    // Replace all placeholders with empty state content
    html = html.replace(/{{TITLE}}/g, `${niche} - No Results Available`);
    html = html.replace(/{{META_DESCRIPTION}}/g, `Currently no products available for ${niche}. Check back soon for updated results.`);
    html = html.replace(/{{META_KEYWORDS}}/g, templateData.meta_keywords.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{NICHE}}/g, niche);
    html = html.replace(/{{HERO_TITLE}}/g, `Top 10 ${niche} (${new Date().getFullYear()})`);
    html = html.replace(/{{INTRO_TITLE}}/g, `About ${niche}`);
    html = html.replace(/{{INTRO_PARAGRAPH}}/g, `<p>We're currently updating our list of the best ${niche.toLowerCase()}. Please check back soon for comprehensive reviews and recommendations.</p>`);
    html = html.replace(/{{PRODUCTS_SECTION_TITLE}}/g, `No Products Available`);
    html = html.replace(/{{PRODUCTS_LIST}}/g, `<div class="empty-results"><p>⚠️ No products with complete information are currently available for this category. We're working on updating our database. Please check back soon!</p></div>`);
    html = html.replace(/{{BUYERS_GUIDE_TITLE}}/g, `Buyer's Guide - Coming Soon`);
    html = html.replace(/{{BUYERS_GUIDE_CONTENT}}/g, `<p>Our comprehensive buyer's guide will be available once we have product data to analyze.</p>`);
    html = html.replace(/{{FAQ_TITLE}}/g, `FAQ - Coming Soon`);
    html = html.replace(/{{FAQ_CONTENT}}/g, `<p>Frequently asked questions will be added once product reviews are available.</p>`);
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
 * Fetch products from Amazon API
 * @param {string} niche - Niche name
 * @returns {Promise<Array>} Array of product objects
 */
async function fetchProducts(niche) {
    const slug = createSlug(niche);
    const dataFile = path.join(CONFIG.DATA_DIR, `${slug}.json`);
    
    try {
        // Configure API request with correct endpoint and parameters
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
        
        console.log(`🔗 API Request: ${options.url}`);
        console.log(`📝 Query: ${niche}`);
        console.log(`🌍 Country: US`);
        console.log(`🔀 Sort By: RELEVANCE`);
        
        const response = await axios.request(options);
        
        // Save raw API response to data directory
        fs.writeFileSync(dataFile, JSON.stringify(response.data, null, 2));
        console.log(`💾 Saved raw API response to: ${dataFile}`);
        
        // Parse response - Amazon Real Time API returns products in data.results
        let productList = [];
        if (response.data && response.data.success && response.data.data && Array.isArray(response.data.data.results)) {
            // New API structure: response.data.data.results
            productList = response.data.data.results;
        } else if (response.data && Array.isArray(response.data.results)) {
            // Alternative structure: response.data.results
            productList = response.data.results;
        } else if (response.data && response.data.data && Array.isArray(response.data.data.products)) {
            // Legacy structure: response.data.data.products
            productList = response.data.data.products;
        } else if (response.data && Array.isArray(response.data.products)) {
            // Legacy structure: response.data.products
            productList = response.data.products;
        } else if (Array.isArray(response.data)) {
            // Direct array
            productList = response.data;
        } else {
            console.error('❌ ERROR: Unexpected API response structure');
            console.error('❌ Response data:', JSON.stringify(response.data).substring(0, 500));
            throw new Error('Invalid API response structure');
        }
        
        console.log(`📦 API returned ${productList.length} products`);
        
        if (productList.length === 0) {
            console.error(`❌ ERROR: API returned no products for "${niche}"`);
            throw new Error('No products found in API response');
        }
        
        // Process and validate products, limit to top 10
        const validProducts = [];
        let skippedCount = 0;
        
        for (let i = 0; i < Math.min(productList.length, 20); i++) {  // Check more products to get 10 valid ones
            const product = productList[i];
            
            console.log(`\n📦 Processing product ${i + 1}...`);
            
            // Step 1: Extract ASIN from search results (REQUIRED)
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
            
            // Price - REQUIRED (prefer details, fallback to search)
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
            
            if (!price) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": missing price for ASIN ${asin}`);
                skippedCount++;
                continue;
            }
            
            // Description - REQUIRED (prefer details, fallback to short_description or features)
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
            
            if (!description) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": missing description for ASIN ${asin}`);
                skippedCount++;
                continue;
            }
            
            // Rating - OPTIONAL (default to null if missing)
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
                rating = '0';  // Default rating
                console.log(`  ℹ️  No rating found, using default: 0`);
            }
            
            // Review Count - OPTIONAL (default to 0 if missing)
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
            
            // Default to 0 if still missing (per requirements)
            if (!reviews) {
                reviews = '0';
                console.log(`  ℹ️  No review count found, using default: 0`);
            }
            
            // Skip products with 0 reviews or 0 rating
            const ratingNum = parseFloat(rating);
            const reviewsNum = parseInt(reviews);
            
            if (ratingNum === 0 || reviewsNum === 0) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": has 0 rating or 0 reviews (rating: ${rating}, reviews: ${reviews})`);
                logSkippedAsin(asin, 'Zero rating or zero reviews');
                skippedCount++;
                continue;
            }
            
            // Rule 5: Skip products with less than minimum review threshold
            if (reviewsNum < CONFIG.MIN_REVIEW_THRESHOLD) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": has ${reviewsNum} reviews (minimum: ${CONFIG.MIN_REVIEW_THRESHOLD})`);
                logSkippedAsin(asin, `Less than ${CONFIG.MIN_REVIEW_THRESHOLD} reviews (${reviewsNum})`);
                skippedCount++;
                continue;
            }
            
            // Rule 2: Check for brand from API (not just title)
            let brand = details.brand || product.brand || null;
            
            // If brand is explicitly null or empty string, skip the product
            if (brand === null || brand === '') {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": brand is null or empty (generic product)`);
                logSkippedAsin(asin, 'Brand is null or empty');
                skippedCount++;
                continue;
            }
            
            // Also check if product has a recognizable brand name in title (generic products)
            if (!hasBrandName(title)) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": no recognizable brand name (generic product)`);
                logSkippedAsin(asin, 'No recognizable brand name in title');
                skippedCount++;
                continue;
            }
            
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
            
            // Rule 4: Extract product specs (battery, weight, driver) for table-card sync
            const specs = extractProductSpecs({ description, features });
            
            // TITLE CLEANUP: Clean product title - Brand + Model only (max 6 words)
            const cleanedTitle = cleanProductTitle(title, brand);
            
            if (!cleanedTitle) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": title too generic or cleanup failed`);
                logSkippedAsin(asin, 'Title too generic or cleanup failed');
                skippedCount++;
                continue;
            }
            
            console.log(`  ✅ Product validated: "${title}" → "${cleanedTitle}"`);
            
            validProducts.push({
                asin: asin,
                title: cleanedTitle,  // Use cleaned title
                originalTitle: title,  // Keep original for reference
                description: description,
                rating: rating,
                reviews: reviews,
                reviewsNum: reviewsNum,  // Store numeric value for badge logic
                price: price,
                image: image,
                url: amazonUrl,
                features: features,
                pros: pros,
                cons: cons,
                battery: specs.battery,  // Rule 4: Spec data
                weight: specs.weight,    // Rule 4: Spec data
                driver: specs.driver,    // Rule 4: Spec data
                brand: brand             // Rule 2: Store brand
            });
            
            // Stop once we have 10 valid products
            if (validProducts.length >= 10) {
                break;
            }
            
            // Rate limiting: Small delay between product_details API calls
            if (i < Math.min(productList.length, 20) - 1) {
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
            }
        }
        
        console.log(`✅ Successfully validated ${validProducts.length} products with real API data`);
        if (skippedCount > 0) {
            console.log(`⚠️  Skipped ${skippedCount} products due to missing fields`);
        }
        
        if (validProducts.length === 0) {
            console.warn('⚠️  WARNING: No valid products after validation');
            console.warn('⚠️  Will generate empty-results page for this niche');
            return []; // Return empty array instead of throwing error
        }
        
        // PREMIUM BRAND PRIORITIZATION: Sort products with premium brands first
        console.log('\n📊 Prioritizing premium brands...');
        validProducts = prioritizePremiumBrands(validProducts);
        
        // Check if we have premium brands in results
        const hasPremiumBrands = validProducts.some(p => isPremiumBrand(p.brand));
        if (!hasPremiumBrands) {
            console.log('⚠️  No premium brands (Sony, Apple, Beats, Bose, Sennheiser) found in results');
            console.log('   Note will be displayed: "No high-end models detected this week – results based on best sellers only."');
        } else {
            const premiumCount = validProducts.filter(p => isPremiumBrand(p.brand)).length;
            console.log(`✓ Found ${premiumCount} premium brand product(s) in results`);
        }
        
        // Check product diversity (premium, mid-range, budget balance)
        const diversity = checkProductDiversity(validProducts.slice(0, 10));
        console.log('\n📊 Product diversity check:');
        console.log(`   Premium ($200+): ${diversity.premiumCount}`);
        console.log(`   Mid-Range ($80-$200): ${diversity.midRangeCount}`);
        console.log(`   Budget (<$80): ${diversity.budgetCount}`);
        
        if (!diversity.hasPremium || !diversity.hasMidRange) {
            console.warn('⚠️  WARNING: Missing diversity - need at least 1 premium and 1 mid-range product');
        } else {
            console.log('✓ Product diversity requirements met');
        }
        
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
 * Generate SEO content
 * @param {string} niche - Niche name
 * @param {Array} products - Products array
 * @returns {object} SEO content object
 */
function generateSEOContent(niche, products) {
    return {
        intro: generateIntroContent(niche, products),
        buyersGuide: generateBuyersGuide(niche),
        faq: generateFAQ(niche, products),
        faqStructuredData: generateFAQStructuredData(niche, products),
        cta: generateCTA(niche)
    };
}

/**
 * Generate products HTML
 * @param {Array} products - Products array
 * @param {string} template - Product template HTML
 * @param {string} niche - Niche name
 * @returns {string} Products HTML
 */
function generateProductsHTML(products, template, niche) {
    // Rule 1: Deduplicate products by ASIN, keeping the one with highest review count
    const asinMap = new Map();
    
    for (const product of products) {
        if (!asinMap.has(product.asin)) {
            asinMap.set(product.asin, product);
        } else {
            const existing = asinMap.get(product.asin);
            const existingReviews = parseInt(existing.reviews) || 0;
            const currentReviews = parseInt(product.reviews) || 0;
            
            if (currentReviews > existingReviews) {
                console.log(`  ⚠️  Replacing duplicate ASIN ${product.asin} (${existingReviews} reviews) with higher review count (${currentReviews} reviews)`);
                asinMap.set(product.asin, product);
            } else {
                console.log(`  ⚠️  Skipping duplicate ASIN ${product.asin} with lower review count (${currentReviews} vs ${existingReviews})`);
            }
        }
    }
    
    const deduplicatedProducts = Array.from(asinMap.values());
    
    if (deduplicatedProducts.length < products.length) {
        console.log(`✓ Rule 1: Deduplicated ${products.length - deduplicatedProducts.length} products`);
    }
    
    return deduplicatedProducts.map((product, index) => {
        const rank = index + 1;
        
        // Rule 5: Add "New entry" badge for products with 100-499 reviews
        const reviewsNum = product.reviewsNum || parseInt(product.reviews) || 0;
        let badge = rank === 1 ? '<span class="badge-best">Best Overall</span>' : 
                    rank === 2 ? '<span class="badge-value">Best Value</span>' : '';
        
        // Add New Entry badge if reviews are between threshold and 500
        if (reviewsNum >= CONFIG.MIN_REVIEW_THRESHOLD && reviewsNum < CONFIG.NEW_ENTRY_THRESHOLD) {
            badge += badge ? ' ' : '';
            badge += '<span class="badge-new">New entry</span>';
        }
        
        // PRICE CATEGORY BADGE: Add Premium/Mid-Range/Budget badge
        const priceCategory = getPriceCategory(product.price);
        if (priceCategory === 'premium') {
            badge += badge ? ' ' : '';
            badge += '<span class="badge-premium">Premium Pick</span>';
        } else if (priceCategory === 'mid-range') {
            badge += badge ? ' ' : '';
            badge += '<span class="badge-midrange">Mid-Range Pick</span>';
        }
        // Budget picks are automatically considered, no explicit badge needed
        
        // Product title is already cleaned, use it directly
        const shortName = product.title;  // Already cleaned during validation
        
        // Rule 6: Proper alt text with Brand, Model, Color
        const altText = `${product.brand || ''} ${shortName}`.trim();
        
        let html = template;
        html = html.replace(/{{RANK}}/g, rank);
        html = html.replace(/{{BADGE}}/g, badge);
        html = html.replace(/{{IMAGE_URL}}/g, product.image);
        html = html.replace(/{{PRODUCT_TITLE}}/g, escapeHtml(shortName));
        html = html.replace(/{{ALT_TEXT}}/g, escapeHtml(altText));  // Rule 6: Proper alt text
        html = html.replace(/{{RATING_STARS}}/g, generateStars(parseFloat(product.rating), product.rating));  // Rule 6: Pass rating for aria-label
        html = html.replace(/{{RATING}}/g, product.rating);
        html = html.replace(/{{REVIEW_COUNT}}/g, product.reviews);
        html = html.replace(/{{PRICE}}/g, product.price);
        html = html.replace(/{{SHORT_DESCRIPTION}}/g, truncate(product.description, 200));
        html = html.replace(/{{FEATURES_LIST}}/g, generateListItems(product.features));
        html = html.replace(/{{AFFILIATE_LINK}}/g, generateAffiliateLink(product));
        html = html.replace(/{{ASIN}}/g, product.asin);
        
        return html;
    }).join('\n\n');
}

/**
 * Generate stars HTML
 * Rule 6: Add role="img" and aria-label for accessibility
 * @param {number} rating - Rating value
 * @param {string} ratingText - Rating text for aria-label
 * @returns {string} Stars HTML with accessibility attributes
 */
function generateStars(rating, ratingText = null) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    const starsHtml = '★'.repeat(fullStars) + 
           (halfStar ? '⯨' : '') + 
           '☆'.repeat(emptyStars);
    
    // Rule 6: Add role and aria-label for screen readers
    const ariaLabel = ratingText ? `${ratingText} out of 5 stars` : `${rating} out of 5 stars`;
    
    return `<span role="img" aria-label="${ariaLabel}">${starsHtml}</span>`;
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
    
    // Generate structured data
    const structuredData = generateStructuredData(niche, slug, products);
    
    // Generate comparison table
    const comparisonTable = generateComparisonTable(products);
    
    // Check if we have premium brands and generate note if not
    const hasPremiumBrands = products.some(p => isPremiumBrand(p.brand));
    const premiumNote = !hasPremiumBrands 
        ? '<div class="premium-note" style="background: #fef3c7; padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: center; color: #92400e;">ℹ️ No high-end models detected this week – results based on best sellers only.</div>'
        : '';
    
    let html = templates.mainTemplate;
    
    // Replace all placeholders
    html = html.replace(/{{TITLE}}/g, templateData.title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{META_DESCRIPTION}}/g, templateData.meta_description.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{META_KEYWORDS}}/g, templateData.meta_keywords.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{NICHE}}/g, niche);
    html = html.replace(/{{HERO_TITLE}}/g, templateData.sections.hero_title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{INTRO_TITLE}}/g, templateData.sections.intro_title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{INTRO_PARAGRAPH}}/g, premiumNote + seoContent.intro);
    html = html.replace(/{{COMPARISON_TABLE}}/g, comparisonTable);
    html = html.replace(/{{PRODUCTS_SECTION_TITLE}}/g, templateData.sections.products_section_title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{PRODUCTS_LIST}}/g, productsHTML);
    html = html.replace(/{{BUYERS_GUIDE_TITLE}}/g, templateData.sections.buyers_guide_title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{BUYERS_GUIDE_CONTENT}}/g, seoContent.buyersGuide);
    html = html.replace(/{{FAQ_TITLE}}/g, templateData.sections.faq_title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{FAQ_CONTENT}}/g, seoContent.faq);
    html = html.replace(/{{CTA_CONTENT}}/g, seoContent.cta);
    html = html.replace(/{{LAST_UPDATED}}/g, lastUpdated);
    html = html.replace(/{{STRUCTURED_DATA}}/g, JSON.stringify(structuredData, null, 2));
    html = html.replace(/{{BASE_URL}}/g, CONFIG.BASE_URL);
    html = html.replace(/{{PAGE_URL}}/g, `${CONFIG.BASE_URL}/${slug}/`);
    
    return html;
}

/**
 * Generate structured data for products
 * Rule 9: JSON-LD Product + AggregateRating for items that pass review threshold
 * @param {string} niche - Niche name
 * @param {string} slug - URL slug
 * @param {Array} products - Products array
 * @returns {object} Structured data object
 */
function generateStructuredData(niche, slug, products) {
    // Rule 9: Only include products that passed the review threshold (already filtered)
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `Top 10 ${niche} (${new Date().getFullYear()})`,
        "description": `The best ${niche.toLowerCase()} available in ${new Date().getFullYear()}, ranked and reviewed`,
        "itemListElement": products.map((product, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "Product",
                "name": product.title,
                "brand": {
                    "@type": "Brand",
                    "name": product.brand || extractBrandFromTitle(product.title)
                },
                "image": product.image,
                "description": product.description,
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": product.rating,
                    "reviewCount": product.reviews,
                    "bestRating": "5",
                    "worstRating": "1"
                },
                "offers": {
                    "@type": "Offer",
                    "price": product.price.replace(/[^0-9.]/g, ''),
                    "priceCurrency": "USD",
                    "availability": "https://schema.org/InStock",
                    "url": generateAffiliateLink(product)
                }
            }
        }))
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
    const blog = generateBlogArticle(product, niche, rank);
    const publishDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Use cleaned product title directly
    const shortName = product.title;  // Already cleaned during validation
    
    // Generate product schema
    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.title,
        "image": product.image,
        "description": product.description,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": product.rating,
            "reviewCount": product.reviews
        },
        "offers": {
            "@type": "Offer",
            "price": product.price.replace(/[^0-9.]/g, ''),
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": generateAffiliateLink(product)
        }
    };
    
    let html = templates.blogTemplate;
    
    // Rule 6: Proper alt text with Brand, Model
    const altText = `${product.brand || ''} ${shortName}`.trim();
    
    html = html.replace(/{{BLOG_TITLE}}/g, escapeHtml(blog.title));
    html = html.replace(/{{BLOG_META_DESCRIPTION}}/g, escapeHtml(blog.metaDescription));
    html = html.replace(/{{PRODUCT_TITLE}}/g, escapeHtml(shortName));
    html = html.replace(/{{ALT_TEXT}}/g, escapeHtml(altText));  // Rule 6: Alt text
    html = html.replace(/{{PUBLISH_DATE}}/g, publishDate);
    html = html.replace(/{{READING_TIME}}/g, blog.readingTime);
    html = html.replace(/{{IMAGE_URL}}/g, product.image);
    html = html.replace(/{{RATING_STARS}}/g, generateStars(parseFloat(product.rating), product.rating));
    html = html.replace(/{{RATING}}/g, product.rating);
    html = html.replace(/{{REVIEW_COUNT}}/g, product.reviews);
    html = html.replace(/{{PRICE}}/g, product.price);
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
    // Common generic starting patterns that indicate no brand
    const genericPatterns = [
        /^[0-9]+ Pack/i,
        /^[0-9]+ Pcs/i,
        /^[0-9]+ Piece/i,
        /^[0-9]+ Set/i,
        /^Generic /i,
        /^Universal /i,
        /^Compatible /i,
        /^Replacement /i,
        /^[0-9]{3,}/  // Starting with numbers like "100 Pack"
    ];
    
    // Check if title starts with generic patterns
    for (const pattern of genericPatterns) {
        if (pattern.test(title)) {
            return false;
        }
    }
    
    // Check if first word is capitalized and looks like a brand name
    // Brand names typically start with capital letters and are at the beginning
    const firstWord = title.trim().split(/[\s-]/)[0];
    
    // If starts with lowercase, likely generic description
    if (firstWord.length > 0 && firstWord[0] === firstWord[0].toLowerCase()) {
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
 * Clean product title - Only Brand + Product name (NO specs, NO features)
 * Remove words: wireless, bluetooth, ANC, over-ear, earbuds, headphones, 2025, version, etc.
 * Max 6 words. Example: "SONY WH-1000XM5 Wireless Over-Ear..." → "Sony WH-1000XM5"
 * @param {string} title - Original product title
 * @param {string} brand - Product brand
 * @returns {string|null} Cleaned title or null if too generic
 */
function cleanProductTitle(title, brand) {
    if (!title || !brand) {
        return null;
    }
    
    // List of words/patterns to remove (specs, features, descriptive terms)
    const wordsToRemove = [
        'wireless', 'bluetooth', 'anc', 'over-ear', 'over ear', 'on-ear', 'on ear',
        'in-ear', 'in ear', 'earbuds', 'headphones', 'headphone', 'earphones', 'earphone',
        '2025', '2024', '2023', 'version', 'noise cancelling', 'noise-cancelling',
        'active noise', 'true wireless', 'tws', 'with microphone', 'with mic',
        'foldable', 'portable', 'lightweight', 'comfortable', 'stereo', 'hifi',
        'hi-fi', 'bass', 'sound', 'audio', 'music', 'gaming', 'sports', 'running',
        'workout', 'gym', 'travel', 'commute', 'office', 'home', 'kids', 'children',
        'waterproof', 'water-proof', 'water resistant', 'sweatproof', 'ipx',
        'charging case', 'charging', 'battery', 'playtime', 'hours', 'hr', 'h',
        'built-in', 'built in', 'compatible', 'android', 'ios', 'iphone', 'samsung',
        'connectivity', 'connection', 'pairing', 'dual', 'triple', 'quad'
    ];
    
    // Split title into main part (before any dash/separator)
    let cleanTitle = title.trim();
    
    // Find first major separator
    const separators = [' - ', ' – ', ' | ', ' with ', ' featuring ', ' for '];
    for (const sep of separators) {
        const idx = cleanTitle.indexOf(sep);
        if (idx > 0) {
            cleanTitle = cleanTitle.substring(0, idx);
            break;
        }
    }
    
    // Remove parenthetical content
    cleanTitle = cleanTitle.replace(/\([^)]*\)/g, '');
    
    // Split into words
    let words = cleanTitle.split(/\s+/).filter(w => w.length > 0);
    
    // Remove words that match the removal list (case-insensitive)
    words = words.filter(word => {
        const lowerWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        return !wordsToRemove.some(removeWord => {
            const lowerRemove = removeWord.toLowerCase().replace(/[^a-z0-9]/g, '');
            return lowerWord === lowerRemove || lowerWord.includes(lowerRemove);
        });
    });
    
    // Ensure brand is at the beginning
    const brandLower = brand.toLowerCase();
    const firstWordLower = words[0] ? words[0].toLowerCase() : '';
    
    if (!firstWordLower.includes(brandLower) && !brandLower.includes(firstWordLower)) {
        words.unshift(brand);
    }
    
    // Limit to 6 words maximum
    words = words.slice(0, 6);
    
    // Rejoin
    cleanTitle = words.join(' ').trim();
    
    // Validation: Must have at least brand + one more word (the model)
    if (words.length < 2) {
        return null;
    }
    
    // Check if title is too generic
    if (isGenericTitle(cleanTitle)) {
        return null;
    }
    
    return cleanTitle;
}

/**
 * Check if a title is too generic (e.g., "Bluetooth Headphones")
 * @param {string} title - Product title
 * @returns {boolean} True if generic
 */
function isGenericTitle(title) {
    const genericPatterns = [
        /^bluetooth\s+headphones?$/i,
        /^wireless\s+headphones?$/i,
        /^earbuds?$/i,
        /^headphones?$/i,
        /^over.?ear\s+headphones?$/i,
        /^in.?ear\s+headphones?$/i,
        /^noise\s+cancell?ing\s+headphones?$/i
    ];
    
    const titleLower = title.toLowerCase().trim();
    return genericPatterns.some(pattern => pattern.test(titleLower));
}

/**
 * Extract price category for badge assignment
 * @param {string} priceStr - Price string like "$199.99"
 * @returns {string} Category: "premium", "mid-range", or "budget"
 */
function getPriceCategory(priceStr) {
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    
    if (price > 200) return 'premium';
    if (price > 80) return 'mid-range';
    return 'budget';
}

/**
 * Check if brand is in premium list
 * @param {string} brand - Brand name
 * @returns {boolean} True if premium brand
 */
function isPremiumBrand(brand) {
    if (!brand) return false;
    
    const premiumBrands = ['sony', 'apple', 'beats', 'bose', 'sennheiser'];
    return premiumBrands.includes(brand.toLowerCase());
}

/**
 * Sort and prioritize products with premium brands first
 * @param {Array} products - Products array
 * @returns {Array} Sorted products with premium brands prioritized
 */
function prioritizePremiumBrands(products) {
    // Separate premium and non-premium
    const premium = [];
    const nonPremium = [];
    
    for (const product of products) {
        if (isPremiumBrand(product.brand)) {
            premium.push(product);
        } else {
            nonPremium.push(product);
        }
    }
    
    // Sort premium by rating * reviews (relevance score)
    premium.sort((a, b) => {
        const scoreA = parseFloat(a.rating) * parseInt(a.reviews);
        const scoreB = parseFloat(b.rating) * parseInt(b.reviews);
        return scoreB - scoreA;
    });
    
    // Sort non-premium by same metric
    nonPremium.sort((a, b) => {
        const scoreA = parseFloat(a.rating) * parseInt(a.reviews);
        const scoreB = parseFloat(b.rating) * parseInt(b.reviews);
        return scoreB - scoreA;
    });
    
    // Combine: premium first, then non-premium
    return [...premium, ...nonPremium];
}

/**
 * Check if products meet diversity requirements (1 premium + 1 mid-range minimum)
 * @param {Array} products - Products array
 * @returns {object} Object with hasPremium, hasMidRange, hasBudget flags
 */
function checkProductDiversity(products) {
    const diversity = {
        hasPremium: false,
        hasMidRange: false,
        hasBudget: false,
        premiumCount: 0,
        midRangeCount: 0,
        budgetCount: 0
    };
    
    for (const product of products) {
        const category = getPriceCategory(product.price);
        if (category === 'premium') {
            diversity.hasPremium = true;
            diversity.premiumCount++;
        } else if (category === 'mid-range') {
            diversity.hasMidRange = true;
            diversity.midRangeCount++;
        } else {
            diversity.hasBudget = true;
            diversity.budgetCount++;
        }
    }
    
    return diversity;
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
        const shortName = product.title;  // Already cleaned during validation
        const cardId = `product-${rank}`;
        const specs = productSpecs[index];
        
        let row = `                <tr>
                    <td class="rank-cell">${rank}</td>
                    <td class="product-name-cell">
                        <a href="#${cardId}" class="product-link">${escapeHtml(shortName)}</a>
                    </td>
                    <td class="rating-cell">${product.rating} ⭐</td>
                    <td class="reviews-cell">${product.reviews}</td>
                    <td class="price-cell">${product.price}</td>`;
        
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
    
    // Rule 3: Price freshness disclaimer
    const priceDisclaimer = `<div class="price-disclaimer" style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary); text-align: center;">
        Price shown is the Amazon.com listing as of writing (updated weekly). Click-through for real-time price.
    </div>`;
    
    // Rule 7: Wrap table with table-wrapper div with tabindex for keyboard accessibility
    return `                <div class="table-wrapper" tabindex="0">
                    <table class="comparison-table">
                        <thead>
${headerRow}
                        </thead>
                        <tbody>
${tableRows}
                        </tbody>
                    </table>
                </div>
${priceDisclaimer}`;
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
    return `# Top 10 ${niche} (${year})

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
