#!/usr/bin/env node
/**
 * AI Review Generator
 * Generates product reviews and blog content using AI
 * Uses OpenAI API for content generation
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Try to import OpenAI, fallback to template-based generation if not available
let OpenAI;
try {
    OpenAI = require('openai').default || require('openai');
} catch (err) {
    console.warn('⚠️ OpenAI package not available, using template-based generation');
}

const CONFIG = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    MODEL: 'gpt-3.5-turbo',
    OUTPUT_DIR: path.join(__dirname, '..', 'data'),
    USE_AI: false // Will be set to true if API key is available
};

// Check if OpenAI is configured
if (CONFIG.OPENAI_API_KEY && OpenAI) {
    CONFIG.USE_AI = true;
}

/**
 * Generate blog intro using AI or templates
 * @param {string} niche - Niche name
 * @param {Array} products - Products array
 * @returns {Promise<string>} Blog intro content
 */
async function generateBlogIntro(niche, products) {
    if (CONFIG.USE_AI) {
        return await generateBlogIntroAI(niche, products);
    } else {
        return generateBlogIntroTemplate(niche, products);
    }
}

/**
 * Generate blog intro using AI
 * @param {string} niche - Niche name
 * @param {Array} products - Products array
 * @returns {Promise<string>} AI-generated intro
 */
async function generateBlogIntroAI(niche, products) {
    try {
        const openai = new OpenAI({ apiKey: CONFIG.OPENAI_API_KEY });
        
        const prompt = `Write a compelling and natural blog introduction for a top 10 list of ${niche}. 
        
Requirements:
- Write in a casual, conversational tone (like a human expert, not an AI)
- 2-3 paragraphs
- Mention that this list is updated regularly based on Amazon data and customer reviews
- Focus on helping readers make informed decisions
- NO marketing buzzwords or salesy language
- Sound authentic and trustworthy

Top products in the list:
${products.slice(0, 3).map((p, i) => `${i + 1}. ${p.title}`).join('\n')}`;

        const response = await openai.chat.completions.create({
            model: CONFIG.MODEL,
            messages: [
                { role: 'system', content: 'You are a helpful product review expert who writes in a natural, conversational style.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.warn('⚠️ AI generation failed, falling back to template:', error.message);
        return generateBlogIntroTemplate(niche, products);
    }
}

/**
 * Generate blog intro using templates (fallback)
 * @param {string} niche - Niche name
 * @param {Array} products - Products array
 * @returns {string} Template-based intro
 */
function generateBlogIntroTemplate(niche, products) {
    const year = new Date().getFullYear();
    const topBrands = [...new Set(products.slice(0, 5).map(p => p.brand).filter(Boolean))].slice(0, 3);
    
    return `Looking for the best ${niche.toLowerCase()}? You've come to the right place. We've spent countless hours researching and analyzing the top options available in ${year}, so you don't have to.

Our team reviews hundreds of customer feedback points, expert opinions, and real-world performance data to bring you this comprehensive guide. ${topBrands.length > 0 ? `This year's top picks include products from ${topBrands.join(', ')}, and ` : ''}we've included options for every budget and use case.

This list is updated weekly with the latest pricing and availability from Amazon, ensuring you always have access to current information when making your purchase decision.`;
}

/**
 * Generate product review using AI or templates
 * @param {object} product - Product object
 * @param {string} niche - Niche name
 * @param {number} rank - Product rank
 * @returns {Promise<object>} Review content
 */
async function generateProductReview(product, niche, rank) {
    if (CONFIG.USE_AI) {
        return await generateProductReviewAI(product, niche, rank);
    } else {
        return generateProductReviewTemplate(product, niche, rank);
    }
}

/**
 * Generate product review using AI
 * @param {object} product - Product object
 * @param {string} niche - Niche name
 * @param {number} rank - Product rank
 * @returns {Promise<object>} AI-generated review
 */
async function generateProductReviewAI(product, niche, rank) {
    try {
        const openai = new OpenAI({ apiKey: CONFIG.OPENAI_API_KEY });
        
        const prompt = `Write a detailed, honest product review for: ${product.title}

Product Details:
- Category: ${niche}
- Rank: #${rank} in our list
- Rating: ${product.rating} stars
- Reviews: ${product.reviews} customer reviews
- Price: ${product.price}
${product.features ? `- Features: ${product.features.slice(0, 3).join(', ')}` : ''}

Requirements:
- Write in first person as if you've used the product
- Be specific and detailed, not generic
- Discuss real use cases and scenarios
- Mention both strengths and potential limitations
- Write 3-4 paragraphs
- Natural, conversational tone (NO AI-sounding language)
- Be honest and helpful, not salesy`;

        const response = await openai.chat.completions.create({
            model: CONFIG.MODEL,
            messages: [
                { role: 'system', content: 'You are an experienced product reviewer who writes honest, detailed reviews in a conversational style.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 800
        });
        
        return {
            content: response.choices[0].message.content.trim(),
            title: `${product.title} Review`,
            metaDescription: `Detailed review of ${product.title}. Read our hands-on experience and find out if this is the right ${niche.toLowerCase()} for you.`
        };
    } catch (error) {
        console.warn('⚠️ AI review generation failed, falling back to template:', error.message);
        return generateProductReviewTemplate(product, niche, rank);
    }
}

/**
 * Generate product review using templates (fallback)
 * @param {object} product - Product object
 * @param {string} niche - Niche name
 * @param {number} rank - Product rank
 * @returns {object} Template-based review
 */
function generateProductReviewTemplate(product, niche, rank) {
    const brand = product.brand || 'this brand';
    const rating = parseFloat(product.rating) || 4.0;
    const reviews = parseInt(product.reviews) || 0;
    
    let content = `The ${product.title} has earned its spot at #${rank} in our ${niche.toLowerCase()} rankings, and for good reason. `;
    
    if (rating >= 4.5) {
        content += `With an impressive ${rating}-star rating from ${reviews.toLocaleString()} customers, it's clear that this product delivers on its promises. `;
    } else if (rating >= 4.0) {
        content += `With a solid ${rating}-star rating backed by ${reviews.toLocaleString()} customer reviews, it represents a reliable choice in its category. `;
    } else {
        content += `While it has a ${rating}-star rating from ${reviews.toLocaleString()} customers, it offers specific advantages that make it worth considering. `;
    }
    
    // Add feature discussion
    if (product.features && product.features.length > 0) {
        content += `\n\nWhat makes this stand out? ${product.features[0]} `;
        if (product.features.length > 1) {
            content += `Additionally, ${product.features[1].toLowerCase()} `;
        }
    }
    
    // Add description context
    if (product.description) {
        content += `\n\n${product.description} `;
    }
    
    // Add value proposition
    content += `\n\nAt ${product.price}, this represents solid value in the ${niche.toLowerCase()} market. Whether you're a first-time buyer or looking to upgrade, it's worth adding to your shortlist.`;
    
    return {
        content,
        title: `${product.title} Review`,
        metaDescription: `Comprehensive review of ${product.title}. Find out why it ranks #${rank} in our ${niche.toLowerCase()} guide.`
    };
}

/**
 * Generate blog conclusion
 * @param {string} niche - Niche name
 * @param {Array} products - Products array
 * @returns {Promise<string>} Conclusion content
 */
async function generateBlogConclusion(niche, products) {
    if (CONFIG.USE_AI) {
        return await generateBlogConclusionAI(niche, products);
    } else {
        return generateBlogConclusionTemplate(niche, products);
    }
}

/**
 * Generate blog conclusion using AI
 */
async function generateBlogConclusionAI(niche, products) {
    try {
        const openai = new OpenAI({ apiKey: CONFIG.OPENAI_API_KEY });
        
        const prompt = `Write a helpful conclusion for a top 10 ${niche} buying guide.

Top 3 products were:
1. ${products[0]?.title || 'N/A'}
2. ${products[1]?.title || 'N/A'}
3. ${products[2]?.title || 'N/A'}

Requirements:
- Summarize the key takeaways
- Remind readers to consider their specific needs
- Encourage them to check current prices on Amazon
- 2-3 sentences
- Natural, helpful tone`;

        const response = await openai.chat.completions.create({
            model: CONFIG.MODEL,
            messages: [
                { role: 'system', content: 'You are a helpful product review expert.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300
        });
        
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.warn('⚠️ AI generation failed, falling back to template');
        return generateBlogConclusionTemplate(niche, products);
    }
}

/**
 * Generate blog conclusion using template
 */
function generateBlogConclusionTemplate(niche, products) {
    return `We hope this guide helps you find the perfect ${niche.toLowerCase()} for your needs. Remember, the best choice depends on your specific requirements, budget, and preferences. All prices and availability are subject to change, so be sure to check Amazon for the most current information before making your purchase.`;
}

/**
 * Save generated content to file
 */
function saveGeneratedContent(niche, content) {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = path.join(CONFIG.OUTPUT_DIR, `${slug}-content.json`);
    
    fs.writeFileSync(filename, JSON.stringify(content, null, 2));
    console.log(`💾 Saved generated content to: ${filename}`);
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const niche = args[0] || 'bluetooth headphones';
    
    console.log('✍️  AI Review Generator\n');
    console.log(`📦 Niche: ${niche}`);
    console.log(`🤖 AI Mode: ${CONFIG.USE_AI ? 'Enabled (OpenAI)' : 'Disabled (Templates)'}\n`);
    
    try {
        // Load products (try to find merged or Amazon data)
        const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let products = [];
        
        // Try different file patterns
        const patterns = [`${slug}-merged.json`, `${slug}-puppeteer.json`, `${slug}.json`];
        for (const pattern of patterns) {
            const filepath = path.join(CONFIG.OUTPUT_DIR, pattern);
            if (fs.existsSync(filepath)) {
                const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
                products = data.products || data.data?.results || data;
                console.log(`📂 Loaded ${products.length} products from: ${pattern}\n`);
                break;
            }
        }
        
        if (products.length === 0) {
            console.error('❌ No products found to generate content for');
            process.exit(1);
        }
        
        // Generate content
        console.log('✍️  Generating content...\n');
        
        const intro = await generateBlogIntro(niche, products);
        console.log('✅ Generated blog intro');
        
        const productReviews = [];
        for (let i = 0; i < Math.min(products.length, 10); i++) {
            const review = await generateProductReview(products[i], niche, i + 1);
            productReviews.push({
                asin: products[i].asin,
                rank: i + 1,
                ...review
            });
            console.log(`✅ Generated review ${i + 1}/10`);
            
            // Small delay to avoid rate limiting
            if (CONFIG.USE_AI && i < 9) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        const conclusion = await generateBlogConclusion(niche, products);
        console.log('✅ Generated conclusion');
        
        // Save all content
        const content = {
            niche,
            generatedAt: new Date().toISOString(),
            method: CONFIG.USE_AI ? 'ai' : 'template',
            intro,
            productReviews,
            conclusion
        };
        
        saveGeneratedContent(niche, content);
        
        console.log('\n✅ Content generation complete!');
        console.log(`📝 Generated ${productReviews.length} product reviews`);
        
    } catch (error) {
        console.error(`\n❌ Content generation failed: ${error.message}`);
        process.exit(1);
    }
}

// Export functions
module.exports = {
    generateBlogIntro,
    generateProductReview,
    generateBlogConclusion,
    saveGeneratedContent
};

// Run if called directly
if (require.main === module) {
    main();
}
