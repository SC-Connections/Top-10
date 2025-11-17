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
    RAPIDAPI_HOST: (process.env.RAPIDAPI_HOST || 'amazon-real-time-api.p.rapidapi.com').trim(),
    AMAZON_AFFILIATE_ID: process.env.AMAZON_AFFILIATE_ID || 'scconnec0d-20',
    BASE_URL: 'https://sc-connections.github.io/Top-10',
    NICHES_FILE: path.join(__dirname, 'niches.csv'),
    TEMPLATES_DIR: path.join(__dirname, 'templates'),
    OUTPUT_DIR: path.join(__dirname, 'sites'),
    PAT_TOKEN: process.env.PAT_TOKEN || '',
    GITHUB_ORG: 'SC-Connections'
};

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Starting niche site generator...\n');
    
    // Read niches from CSV
    const niches = readNiches();
    console.log(`📋 Found ${niches.length} niches to process\n`);
    
    // Track generated niche URLs for index page
    const generatedNiches = [];
    
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
                    console.log('⚠️  Site will still be available in main repo');
                }
            } else {
                console.log('\n⚠️  PAT_TOKEN not configured, skipping separate repository publishing');
            }
            
            generatedNiches.push({ niche, slug, url: publicUrl });
            console.log(`✅ Successfully generated site for: ${niche}\n`);
        } catch (error) {
            console.error(`❌ Error generating site for ${niche}:`, error.message);
        }
    }
    
    // Save generated niches data for index page generation
    const dataFile = path.join(CONFIG.OUTPUT_DIR, '_niches_data.json');
    fs.writeFileSync(dataFile, JSON.stringify(generatedNiches, null, 2));
    console.log(`\n📝 Saved niche data to: ${dataFile}`);
    
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
    
    // Fetch products from Amazon API
    console.log('🔍 Fetching products from Amazon...');
    const products = await fetchProducts(niche);
    console.log(`✓ Found ${products.length} products`);
    
    // Load templates
    const templates = loadTemplates();
    
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
    
    // Copy CSS
    console.log('🎨 Copying styles...');
    fs.copyFileSync(
        path.join(CONFIG.TEMPLATES_DIR, 'global.css'),
        path.join(siteDir, 'global.css')
    );
    
    console.log(`✓ Site generated at: /sites/${slug}/`);
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
    // If API credentials are not set, return mock data
    if (!CONFIG.RAPIDAPI_KEY || CONFIG.RAPIDAPI_KEY === '') {
        console.log('⚠️  WARNING: No API key found, using mock data...');
        console.log('⚠️  To use real Amazon data, set RAPIDAPI_KEY environment variable');
        return generateMockProducts(niche);
    }
    
    try {
        const options = {
            method: 'GET',
            url: `https://${CONFIG.RAPIDAPI_HOST}/product-search`,
            params: {
                query: niche,
                page: '1',
                country: 'US',
                sort_by: 'RELEVANCE',
                product_condition: 'ALL'
            },
            headers: {
                'X-RapidAPI-Key': CONFIG.RAPIDAPI_KEY,
                'X-RapidAPI-Host': CONFIG.RAPIDAPI_HOST
            },
            timeout: 30000
        };
        
        console.log(`🔗 API Request: ${options.url}`);
        const response = await axios.request(options);
        
        // Handle different possible response structures
        let productList = [];
        if (response.data && response.data.data && response.data.data.products) {
            productList = response.data.data.products;
        } else if (response.data && Array.isArray(response.data.products)) {
            productList = response.data.products;
        } else if (response.data && Array.isArray(response.data)) {
            productList = response.data;
        }
        
        console.log(`📦 API returned ${productList.length} products`);
        
        if (productList.length === 0) {
            console.log('⚠️  WARNING: API returned no products, falling back to mock data');
            return generateMockProducts(niche);
        }
        
        // Process and validate products, limit to top 10
        const validProducts = [];
        for (let i = 0; i < Math.min(productList.length, 10); i++) {
            const product = productList[i];
            
            // Extract ASIN - try multiple field names
            const asin = product.asin || product.ASIN || null;
            
            // Extract title - try multiple field names
            const title = product.product_title || product.title || product.name || null;
            
            // Extract image - ensure it's an absolute URL
            let image = product.product_photo || product.image || product.main_image || product.product_main_image_url || null;
            if (image && !image.startsWith('http')) {
                image = null; // Invalid image URL
            }
            
            // Validate required fields
            if (!asin || !title || !image) {
                console.log(`⚠️  Skipping product ${i + 1}: Missing required fields (ASIN: ${!!asin}, Title: ${!!title}, Image: ${!!image})`);
                continue;
            }
            
            // Extract other fields with fallbacks
            const rating = product.product_star_rating || product.rating || product.stars || '4.5';
            const reviews = product.product_num_ratings || product.reviews_count || product.review_count || '1000';
            const price = product.product_price || product.price || '$99.99';
            
            // Build Amazon URL using ASIN
            const amazonUrl = `https://www.amazon.com/dp/${asin}?tag=${CONFIG.AMAZON_AFFILIATE_ID}`;
            
            validProducts.push({
                asin: asin,
                title: title,
                description: product.product_description || product.description || `High-quality ${niche.toLowerCase()} with excellent features.`,
                rating: String(rating),
                reviews: String(reviews),
                price: price,
                image: image,
                url: amazonUrl,
                features: extractFeatures(product),
                pros: extractPros(product),
                cons: extractCons(product)
            });
        }
        
        console.log(`✅ Successfully validated ${validProducts.length} products`);
        
        if (validProducts.length === 0) {
            console.log('⚠️  WARNING: No valid products after validation, falling back to mock data');
            return generateMockProducts(niche);
        }
        
        return validProducts;
        
    } catch (error) {
        console.log(`⚠️  WARNING: API Error - ${error.message}`);
        console.log('⚠️  Falling back to mock data');
        if (error.response) {
            console.log(`⚠️  API Response Status: ${error.response.status}`);
            console.log(`⚠️  API Response Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
        return generateMockProducts(niche);
    }
}

/**
 * Generate mock products for testing
 * @param {string} niche - Niche name
 * @returns {Array} Array of mock product objects
 */
function generateMockProducts(niche) {
    const products = [];
    
    // Mock ASINs that look realistic
    const mockAsins = ['B0CX57HMHW', 'B0D19KQPS3', 'B0BMQVXZ3H', 'B0BXLMM4SH', 'B0CHSG7FXT', 
                       'B0C9SJHFWV', 'B0BXQVQBGZ', 'B0CDZQFV8F', 'B0BXQC7MMK', 'B0CDZQFV9G'];
    
    for (let i = 1; i <= 10; i++) {
        products.push({
            asin: mockAsins[i - 1],
            title: `${niche} Model ${i} - Premium Edition`,
            description: `This is a high-quality ${niche.toLowerCase()} that offers excellent value and performance. Features include advanced technology, durable construction, and user-friendly design.`,
            rating: (4.0 + Math.random() * 1.0).toFixed(1),
            reviews: Math.floor(500 + Math.random() * 4500),
            price: `$${(49.99 + Math.random() * 200).toFixed(2)}`,
            image: `https://m.media-amazon.com/images/I/41aUW0J4${i}SL._AC_SL1500_.jpg`,
            url: `https://www.amazon.com/dp/${mockAsins[i - 1]}?tag=${CONFIG.AMAZON_AFFILIATE_ID}`,
            features: [
                'High-quality construction',
                'Advanced features',
                'User-friendly design',
                'Excellent value for money',
                'Trusted brand'
            ],
            pros: [
                'Excellent build quality',
                'Great performance',
                'Good value for money',
                'Positive customer reviews',
                'Reliable brand'
            ],
            cons: [
                'May be pricey for some',
                'Limited color options',
                'Availability may vary'
            ]
        });
    }
    
    return products;
}

/**
 * Extract features from product data
 * @param {object} product - Product object
 * @returns {Array} Features array
 */
function extractFeatures(product) {
    if (product.product_details) {
        return Object.values(product.product_details).slice(0, 5);
    }
    return [
        'High-quality construction',
        'Advanced features',
        'User-friendly design',
        'Excellent value',
        'Trusted brand'
    ];
}

/**
 * Extract pros from product data
 * @param {object} product - Product object
 * @returns {Array} Pros array
 */
function extractPros(product) {
    return [
        'Excellent build quality',
        'Great performance',
        'Good value for money',
        'Positive customer reviews',
        'Reliable brand'
    ];
}

/**
 * Extract cons from product data
 * @param {object} product - Product object
 * @returns {Array} Cons array
 */
function extractCons(product) {
    return [
        'May be pricey for some',
        'Limited options',
        'Availability may vary'
    ];
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
 */
function pushToGitHub(siteDir, repoName) {
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
        
        // Commit
        execSync('git commit -m "Auto-generated niche site"', { cwd: siteDir, stdio: 'pipe' });
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
    pushToGitHub(siteDir, repoName);
    
    // Step 4: Enable GitHub Pages
    console.log('4️⃣  Enabling GitHub Pages...');
    const pagesUrl = await enableGitHubPages(repoName);
    
    console.log(`\n🌐 Public URL: ${pagesUrl}`);
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
