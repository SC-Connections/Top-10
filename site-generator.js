/**
 * Main Site Generator
 * Generates complete niche review sites using Amazon product data
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
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
    OUTPUT_DIR: path.join(__dirname, 'sites'),
    DATA_DIR: path.join(__dirname, 'data'),
    PAT_TOKEN: process.env.PAT_TOKEN || '',
    GITHUB_ORG: 'SC-Connections'
};

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
    for (const niche of niches) {
        try {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📦 Processing: ${niche}`);
            console.log('='.repeat(60));
            
            const slug = createSlug(niche);
            await generateSiteForNiche(niche);
            
            // Publish to separate GitHub repository if PAT_TOKEN is available
            let publicUrl = `${CONFIG.BASE_URL}/sites/${slug}/`;
            if (CONFIG.PAT_TOKEN) {
                console.log('\n🚀 Publishing to separate GitHub repository...');
                try {
                    publicUrl = await publishToGitHub(slug, niche);
                    console.log(`✅ Published to: ${publicUrl}`);
                } catch (error) {
                    console.error(`❌ Failed to publish to GitHub: ${error.message}`);
                    console.log('⚠️  Continuing with next niche...');
                    // Don't re-throw - continue with other niches
                }
            } else {
                console.log('\n⚠️  PAT_TOKEN not configured, skipping separate repository publishing');
            }
            
            generatedNiches.push({ niche, slug, url: publicUrl });
            console.log(`✅ Successfully generated site for: ${niche}\n`);
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
    
    // Handle empty results
    if (products.length === 0) {
        console.warn('⚠️  No valid products found, generating empty-results page...');
        generateEmptyResultsPage(siteDir, niche, slug, templates);
        console.log(`✓ Empty-results page generated at: /sites/${slug}/`);
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
    
    console.log(`✓ Site generated at: /sites/${slug}/`);
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
    const lastUpdated = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
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
    html = html.replace(/{{PAGE_URL}}/g, `${CONFIG.BASE_URL}/sites/${slug}/`);
    
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
                domain: CONFIG.AMAZON_DOMAIN
            },
            headers: {
                'X-RapidAPI-Key': CONFIG.RAPIDAPI_KEY,
                'X-RapidAPI-Host': CONFIG.RAPIDAPI_HOST
            },
            timeout: 30000
        };
        
        console.log(`🔗 API Request: ${options.url}`);
        console.log(`📝 Query: ${niche}`);
        console.log(`🌍 Domain: ${CONFIG.AMAZON_DOMAIN}`);
        
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
            
            // Extract ASIN - try multiple field names
            const asin = product.asin || product.ASIN || null;
            
            // Extract title - new API uses 'title', legacy uses 'product_title'
            const title = product.title || product.product_title || product.name || null;
            
            // Extract image - new API uses 'image_url', legacy uses 'product_photo'
            // Also try images array if available
            // Ensure it's an absolute URL
            let image = product.image_url || product.image || product.product_photo || product.main_image || product.product_main_image_url || null;
            
            // Try images array if single image not found
            if (!image && product.images && Array.isArray(product.images) && product.images.length > 0) {
                image = product.images[0];
            }
            
            if (image && !image.startsWith('http')) {
                image = null; // Invalid image URL
            }
            
            // Validate core required fields - SKIP if missing instead of failing
            if (!asin || !title || !image) {
                console.warn(`⚠️  Skipping product ${i + 1}: missing core fields (ASIN: ${!!asin}, Title: ${!!title}, Image: ${!!image})`);
                skippedCount++;
                continue;
            }
            
            // Extract rating - SKIP if missing
            let rating = null;
            if (typeof product.rating === 'number') {
                rating = String(product.rating);
            } else if (product.product_star_rating) {
                rating = String(product.product_star_rating);
            } else if (product.stars) {
                rating = String(product.stars);
            }
            
            if (!rating) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": missing rating`);
                skippedCount++;
                continue;
            }
            
            // Extract review count - SKIP if missing
            let reviews = null;
            if (product.review_count) {
                reviews = String(product.review_count);
            } else if (product.product_num_ratings) {
                reviews = String(product.product_num_ratings);
            } else if (product.reviews_count) {
                reviews = String(product.reviews_count);
            }
            
            if (!reviews) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": missing review count`);
                skippedCount++;
                continue;
            }
            
            // Extract price - SKIP if missing
            let price = null;
            if (typeof product.price === 'number') {
                price = `$${product.price.toFixed(2)}`;
            } else if (product.price) {
                price = String(product.price);
            } else if (product.product_price) {
                price = String(product.product_price);
            }
            
            if (!price) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": missing price`);
                skippedCount++;
                continue;
            }
            
            // Extract description - required field
            let description = product.product_description || product.description || null;
            
            if (!description) {
                console.warn(`⚠️  Skipping product ${i + 1} "${title}": missing description`);
                skippedCount++;
                continue;
            }
            
            // Extract feature bullets - required field (array with at least 1 item)
            let featureBullets = product.feature_bullets || product.features || product.about_product || null;
            
            // Ensure feature_bullets is an array with at least 1 item
            if (!featureBullets || !Array.isArray(featureBullets) || featureBullets.length === 0) {
                // Try to convert string to array if it's a string
                if (typeof featureBullets === 'string' && featureBullets.length > 0) {
                    featureBullets = [featureBullets];
                } else {
                    // Generate feature bullets from description as fallback
                    featureBullets = generateFeaturesFromDescription(description);
                    if (featureBullets.length === 0) {
                        console.warn(`⚠️  Skipping product ${i + 1} "${title}": missing feature bullets`);
                        skippedCount++;
                        continue;
                    }
                    console.log(`   ℹ️  Generated feature bullets from description for "${title}"`);
                }
            }
            
            // Build Amazon URL - prefer detail_page_url from API
            let amazonUrl = product.detail_page_url || product.product_url || product.url || null;
            
            if (!amazonUrl) {
                // Construct from ASIN if not provided
                amazonUrl = `https://www.amazon.com/dp/${asin}`;
            }
            
            // Validate URL format
            if (!amazonUrl.startsWith('http')) {
                amazonUrl = `https://www.amazon.com/dp/${asin}`;
            }
            
            // Ensure affiliate tag is added
            if (!amazonUrl.includes('tag=')) {
                const separator = amazonUrl.includes('?') ? '&' : '?';
                amazonUrl = `${amazonUrl}${separator}tag=${CONFIG.AMAZON_AFFILIATE_ID}`;
            }
            
            // Use validated feature bullets
            const features = featureBullets.slice(0, 5);
            
            // Try to extract pros (don't fail if missing, we'll generate from data)
            let pros = [];
            try {
                pros = extractPros(product, niche);
            } catch (error) {
                console.warn(`   ℹ️  Generating pros from available data for "${title}"`);
                pros = generateProsFromProduct(product, rating, reviews);
            }
            
            // Extract cons (always succeeds with defaults)
            const cons = extractCons(product, niche);
            
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
 * Extract features from product data - with fallback to description
 * @param {object} product - Product object
 * @param {string} niche - Niche name for error messages
 * @returns {Array} Features array
 */
function extractFeatures(product, niche) {
    // Try to extract features from various API fields
    if (product.features && Array.isArray(product.features) && product.features.length > 0) {
        return product.features.slice(0, 5);
    }
    
    if (product.feature_bullets && Array.isArray(product.feature_bullets) && product.feature_bullets.length > 0) {
        return product.feature_bullets.slice(0, 5);
    }
    
    if (product.attributes && Array.isArray(product.attributes) && product.attributes.length > 0) {
        return product.attributes.slice(0, 5);
    }
    
    if (product.product_details && typeof product.product_details === 'object') {
        const details = Object.values(product.product_details).filter(v => v && typeof v === 'string');
        if (details.length > 0) {
            return details.slice(0, 5);
        }
    }
    
    if (product.about_product && Array.isArray(product.about_product) && product.about_product.length > 0) {
        return product.about_product.slice(0, 5);
    }
    
    // If no features found, throw error to trigger fallback
    throw new Error(`No structured features found for product "${product.title}"`);
}

/**
 * Generate features from product description when structured features are not available
 * @param {string} description - Product description
 * @returns {Array} Features array
 */
function generateFeaturesFromDescription(description) {
    // Split description into sentences and use as features
    const sentences = description
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10 && s.length < 200);
    
    if (sentences.length > 0) {
        return sentences.slice(0, 5);
    }
    
    // If description doesn't split well, create a single feature
    return [description.substring(0, 150)];
}

/**
 * Generate pros from available product data when structured pros are not available
 * @param {object} product - Product object
 * @param {string} rating - Rating value
 * @param {string} reviews - Review count
 * @returns {Array} Pros array
 */
function generateProsFromProduct(product, rating, reviews) {
    const pros = [];
    
    // Build pros from available real data
    if (rating && parseFloat(rating) >= 4.0) {
        pros.push(`Highly rated (${rating} stars)`);
    }
    
    if (reviews) {
        const reviewCount = parseInt(reviews.toString().replace(/,/g, ''));
        if (reviewCount > 1000) {
            pros.push(`Popular choice (${reviews} reviews)`);
        } else if (reviewCount > 100) {
            pros.push(`Well-reviewed (${reviews} reviews)`);
        }
    }
    
    if (product.discount_percentage && product.discount_percentage > 10) {
        pros.push(`Good value (${product.discount_percentage}% off)`);
    }
    
    if (product.is_prime || product.prime) {
        pros.push('Amazon Prime eligible');
    }
    
    // Add generic but factual pros
    if (pros.length < 3) {
        pros.push('Quality construction');
        pros.push('Reliable performance');
    }
    
    return pros.slice(0, 5);
}

/**
 * Extract pros from product data - with fallback generation
 * @param {object} product - Product object
 * @param {string} niche - Niche name for error messages
 * @returns {Array} Pros array
 */
function extractPros(product, niche) {
    const pros = [];
    
    // Try to extract pros from API data
    if (product.pros && Array.isArray(product.pros) && product.pros.length > 0) {
        return product.pros.slice(0, 5);
    }
    
    if (product.positives && Array.isArray(product.positives) && product.positives.length > 0) {
        return product.positives.slice(0, 5);
    }
    
    // Build pros from available real data
    if (product.rating && parseFloat(product.rating) >= 4.0) {
        pros.push(`Highly rated (${product.rating} stars)`);
    }
    
    if (product.review_count && parseInt(product.review_count) > 1000) {
        pros.push(`Popular choice (${product.review_count.toLocaleString()} reviews)`);
    }
    
    if (product.discount_percentage && product.discount_percentage > 10) {
        pros.push(`Good value (${product.discount_percentage}% off)`);
    }
    
    // Use features as pros if available
    if (product.features && Array.isArray(product.features)) {
        pros.push(...product.features.slice(0, 3));
    } else if (product.feature_bullets && Array.isArray(product.feature_bullets)) {
        pros.push(...product.feature_bullets.slice(0, 3));
    } else if (product.about_product && Array.isArray(product.about_product)) {
        pros.push(...product.about_product.slice(0, 3));
    }
    
    if (pros.length === 0) {
        throw new Error(`Product "${product.title}" has insufficient data to generate pros`);
    }
    
    return pros.slice(0, 5);
}

/**
 * Extract cons from product data - Minimal, factual only
 * @param {object} product - Product object
 * @param {string} niche - Niche name for error messages
 * @returns {Array} Cons array
 */
function extractCons(product, niche) {
    const cons = [];
    
    // Try to extract cons from API data
    if (product.cons && Array.isArray(product.cons) && product.cons.length > 0) {
        return product.cons.slice(0, 3);
    }
    
    if (product.negatives && Array.isArray(product.negatives) && product.negatives.length > 0) {
        return product.negatives.slice(0, 3);
    }
    
    // Build minimal cons from factual data
    if (product.price && typeof product.price === 'number' && product.price > 100) {
        cons.push('Higher price point');
    }
    
    if (product.rating && parseFloat(product.rating) < 4.5) {
        cons.push('Some mixed reviews');
    }
    
    // Amazon API doesn't typically provide cons, so we need at least one factual statement
    if (cons.length === 0) {
        cons.push('Check compatibility with your specific needs');
    }
    
    return cons;
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
    return products.map((product, index) => {
        const rank = index + 1;
        const badge = rank === 1 ? '<span class="badge-best">Best Overall</span>' : 
                     rank === 2 ? '<span class="badge-value">Best Value</span>' : '';
        
        let html = template;
        html = html.replace(/{{RANK}}/g, rank);
        html = html.replace(/{{BADGE}}/g, badge);
        html = html.replace(/{{IMAGE_URL}}/g, product.image);
        html = html.replace(/{{PRODUCT_TITLE}}/g, escapeHtml(product.title));
        html = html.replace(/{{RATING_STARS}}/g, generateStars(parseFloat(product.rating)));
        html = html.replace(/{{RATING}}/g, product.rating);
        html = html.replace(/{{REVIEW_COUNT}}/g, product.reviews);
        html = html.replace(/{{PRICE}}/g, product.price);
        html = html.replace(/{{SHORT_DESCRIPTION}}/g, truncate(product.description, 200));
        html = html.replace(/{{FEATURES_LIST}}/g, generateListItems(product.features));
        html = html.replace(/{{PROS_LIST}}/g, generateListItems(product.pros));
        html = html.replace(/{{CONS_LIST}}/g, generateListItems(product.cons));
        html = html.replace(/{{AFFILIATE_LINK}}/g, generateAffiliateLink(product));
        html = html.replace(/{{ASIN}}/g, product.asin);
        
        return html;
    }).join('\n\n');
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
    const lastUpdated = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Generate structured data
    const structuredData = generateStructuredData(niche, slug, products);
    
    let html = templates.mainTemplate;
    
    // Replace all placeholders
    html = html.replace(/{{TITLE}}/g, templateData.title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{META_DESCRIPTION}}/g, templateData.meta_description.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{META_KEYWORDS}}/g, templateData.meta_keywords.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{NICHE}}/g, niche);
    html = html.replace(/{{HERO_TITLE}}/g, templateData.sections.hero_title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{INTRO_TITLE}}/g, templateData.sections.intro_title.replace(/{{NICHE}}/g, niche));
    html = html.replace(/{{INTRO_PARAGRAPH}}/g, seoContent.intro);
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
    html = html.replace(/{{PAGE_URL}}/g, `${CONFIG.BASE_URL}/sites/${slug}/`);
    
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
    html = html.replace(/{{BLOG_TITLE}}/g, escapeHtml(blog.title));
    html = html.replace(/{{BLOG_META_DESCRIPTION}}/g, escapeHtml(blog.metaDescription));
    html = html.replace(/{{PRODUCT_TITLE}}/g, escapeHtml(product.title));
    html = html.replace(/{{PUBLISH_DATE}}/g, publishDate);
    html = html.replace(/{{READING_TIME}}/g, blog.readingTime);
    html = html.replace(/{{IMAGE_URL}}/g, product.image);
    html = html.replace(/{{RATING_STARS}}/g, generateStars(parseFloat(product.rating)));
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

View the live site at: https://sc-connections.github.io/top10-${slug}/

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

/**
 * Create a new GitHub repository
 * @param {string} repoName - Repository name (slug)
 * @param {string} description - Repository description
 * @returns {Promise<object>} Repository data
 */
async function createGitHubRepo(repoName, description) {
    const url = 'https://api.github.com/user/repos';
    
    try {
        const response = await axios.post(url, {
            name: repoName,
            description: description,
            private: false,
            auto_init: false
        }, {
            headers: {
                'Authorization': `Bearer ${CONFIG.PAT_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'SC-Connections-Site-Generator'
            }
        });
        
        console.log(`✓ Repository created: ${response.data.html_url}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 422) {
            // Repository already exists, fetch it
            console.log(`⚠️  Repository ${repoName} already exists, fetching details...`);
            const getResponse = await axios.get(`https://api.github.com/repos/${CONFIG.GITHUB_ORG}/${repoName}`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.PAT_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SC-Connections-Site-Generator'
                }
            });
            return getResponse.data;
        }
        throw new Error(`Failed to create repository: ${error.message}`);
    }
}

/**
 * Initialize git and push site contents to GitHub
 * @param {string} siteDir - Site directory path
 * @param {string} repoName - Repository name
 * @param {string} slug - Niche slug for commit message
 */
function pushToGitHub(siteDir, repoName, slug) {
    const repoUrl = `https://${CONFIG.PAT_TOKEN}@github.com/${CONFIG.GITHUB_ORG}/${repoName}.git`;
    
    try {
        // Configure git
        execSync('git config --global user.email "actions@github.com"', { stdio: 'pipe' });
        execSync('git config --global user.name "GitHub Actions"', { stdio: 'pipe' });
        
        // Initialize git repository
        execSync('git init', { cwd: siteDir, stdio: 'pipe' });
        console.log('✓ Initialized git repository');
        
        // Add all files
        execSync('git add .', { cwd: siteDir, stdio: 'pipe' });
        console.log('✓ Added all files');
        
        // Commit with slug in message
        execSync(`git commit -m "Initial site publish: ${slug}"`, { cwd: siteDir, stdio: 'pipe' });
        console.log('✓ Created commit');
        
        // Set branch to main
        execSync('git branch -M main', { cwd: siteDir, stdio: 'pipe' });
        
        // Add remote
        execSync(`git remote add origin ${repoUrl}`, { cwd: siteDir, stdio: 'pipe' });
        console.log('✓ Added remote origin');
        
        // Push to GitHub (force push to handle existing repos)
        execSync('git push -f origin main', { cwd: siteDir, stdio: 'pipe' });
        console.log('✓ Pushed to GitHub');
        
    } catch (error) {
        throw new Error(`Failed to push to GitHub: ${error.message}`);
    }
}

/**
 * Enable GitHub Pages for a repository
 * @param {string} repoName - Repository name
 * @returns {Promise<string>} Pages URL
 */
async function enableGitHubPages(repoName) {
    const url = `https://api.github.com/repos/${CONFIG.GITHUB_ORG}/${repoName}/pages`;
    
    try {
        // Try to create/update Pages configuration
        const response = await axios.post(url, {
            source: {
                branch: 'main',
                path: '/'
            }
        }, {
            headers: {
                'Authorization': `Bearer ${CONFIG.GH_PAT}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'SC-Connections-Site-Generator'
            }
        });
        
        console.log('✓ GitHub Pages enabled');
        return response.data.html_url;
    } catch (error) {
        if (error.response && error.response.status === 409) {
            // Pages already enabled, try to update it
            console.log('⚠️  GitHub Pages already enabled, updating configuration...');
            try {
                const updateResponse = await axios.put(url, {
                    source: {
                        branch: 'main',
                        path: '/'
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${CONFIG.PAT_TOKEN}`,
                        'Accept': 'application/vnd.github+json',
                        'User-Agent': 'SC-Connections-Site-Generator'
                    }
                });
                console.log('✓ GitHub Pages configuration updated');
                return `https://${CONFIG.GITHUB_ORG.toLowerCase()}.github.io/${repoName}/`;
            } catch (updateError) {
                console.log('⚠️  Could not update Pages config, using default URL');
                return `https://${CONFIG.GITHUB_ORG.toLowerCase()}.github.io/${repoName}/`;
            }
        }
        
        // If error is not 409, still return the expected URL
        console.log(`⚠️  Pages API error (${error.response?.status}), but Pages may auto-enable. Using expected URL.`);
        return `https://${CONFIG.GITHUB_ORG.toLowerCase()}.github.io/${repoName}/`;
    }
}

/**
 * Create GitHub Actions workflow file for Pages deployment
 * @param {string} siteDir - Site directory path
 */
function createGitHubPagesWorkflow(siteDir) {
    const workflowDir = path.join(siteDir, '.github', 'workflows');
    fs.mkdirSync(workflowDir, { recursive: true });
    
    const workflowContent = `name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: '.'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
    
    const workflowPath = path.join(workflowDir, 'deploy.yml');
    fs.writeFileSync(workflowPath, workflowContent);
    console.log(`✓ Created workflow file: .github/workflows/deploy.yml`);
}

/**
 * Publish site to separate GitHub repository
 * @param {string} slug - Niche slug
 * @param {string} niche - Niche name
 * @returns {Promise<string>} Public site URL
 */
async function publishToGitHub(slug, niche) {
    const siteDir = path.join(CONFIG.OUTPUT_DIR, slug);
    const repoName = `top10-${slug}`;  // Add top10- prefix to repo name
    const description = `Auto-generated Top 10 ${niche} review site`;
    
    console.log(`\n📤 Publishing ${slug} to GitHub as ${repoName}...`);
    
    // Step 1: Create GitHub repository
    console.log('1️⃣  Creating GitHub repository...');
    await createGitHubRepo(repoName, description);
    
    // Step 2: Create GitHub Actions workflow file for deployment
    console.log('2️⃣  Creating GitHub Actions workflow...');
    createGitHubPagesWorkflow(siteDir);
    
    // Step 3: Push site contents
    console.log('3️⃣  Pushing site contents...');
    pushToGitHub(siteDir, repoName, slug);
    
    // Step 4: Enable GitHub Pages
    console.log('4️⃣  Enabling GitHub Pages...');
    const pagesUrl = await enableGitHubPages(repoName);
    
    console.log(`\n📢 Published site to: ${pagesUrl}`);
    return pagesUrl;
}

// Run the generator
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main };
