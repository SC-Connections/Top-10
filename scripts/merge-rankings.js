#!/usr/bin/env node
/**
 * Merge Rankings Script
 * Combines Amazon Best Sellers with Google Trends data
 * Uses weighted scoring: Amazon (60%) + Google Trends (40%)
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
    DATA_DIR: path.join(__dirname, '..', 'data'),
    AMAZON_WEIGHT: 0.6,
    TRENDS_WEIGHT: 0.4,
    OUTPUT_DIR: path.join(__dirname, '..', 'data')
};

/**
 * Calculate Amazon score based on ranking position
 * @param {number} rank - Product rank (1-based)
 * @param {number} totalProducts - Total number of products
 * @returns {number} Normalized score (0-100)
 */
function calculateAmazonScore(rank, totalProducts) {
    // Higher rank = lower score
    // Rank 1 = 100, Rank 20 = 5 (assuming 20 products)
    const normalizedScore = ((totalProducts - rank + 1) / totalProducts) * 100;
    return normalizedScore;
}

/**
 * Calculate Google Trends score
 * @param {number} trendScore - Trend score from Google Trends
 * @returns {number} Normalized score (0-100)
 */
function calculateTrendsScore(trendScore) {
    // Trend score is already normalized (0-100)
    return trendScore || 0;
}

/**
 * Calculate composite score
 * @param {number} amazonScore - Amazon score
 * @param {number} trendsScore - Trends score
 * @returns {number} Weighted composite score
 */
function calculateCompositeScore(amazonScore, trendsScore) {
    return (amazonScore * CONFIG.AMAZON_WEIGHT) + (trendsScore * CONFIG.TRENDS_WEIGHT);
}

/**
 * Merge Amazon products with Google Trends data
 * @param {Array} amazonProducts - Products from Amazon
 * @param {Array} trends - Trends from Google
 * @returns {Array} Merged and ranked products
 */
function mergeRankings(amazonProducts, trends) {
    console.log('\n🔗 Merging Amazon + Google Trends data...');
    console.log(`📦 Amazon products: ${amazonProducts.length}`);
    console.log(`📈 Trend queries: ${trends.length}`);
    
    const totalProducts = amazonProducts.length;
    
    // Process each product
    const mergedProducts = amazonProducts.map((product, index) => {
        const amazonRank = index + 1;
        const amazonScore = calculateAmazonScore(amazonRank, totalProducts);
        
        // Match product with trends
        const productTitle = (product.title || '').toLowerCase();
        const productBrand = (product.brand || '').toLowerCase();
        let maxTrendScore = 0;
        let matchedQuery = null;
        
        for (const trend of trends) {
            const query = trend.query.toLowerCase();
            const queryWords = query.split(/\s+/).filter(w => w.length > 2);
            
            // Count matching words
            let matches = 0;
            for (const word of queryWords) {
                if (productTitle.includes(word) || productBrand.includes(word)) {
                    matches++;
                }
            }
            
            // Calculate match percentage
            const matchPercentage = queryWords.length > 0 ? (matches / queryWords.length) : 0;
            const trendScore = matchPercentage * trend.trendScore;
            
            if (trendScore > maxTrendScore) {
                maxTrendScore = trendScore;
                matchedQuery = trend.query;
            }
        }
        
        const trendsScore = calculateTrendsScore(maxTrendScore);
        const compositeScore = calculateCompositeScore(amazonScore, trendsScore);
        
        return {
            ...product,
            ranking: {
                amazonRank,
                amazonScore,
                trendsScore,
                compositeScore,
                matchedTrendQuery: matchedQuery
            }
        };
    });
    
    // Sort by composite score (highest first)
    mergedProducts.sort((a, b) => b.ranking.compositeScore - a.ranking.compositeScore);
    
    // Add final rank
    mergedProducts.forEach((product, index) => {
        product.ranking.finalRank = index + 1;
    });
    
    console.log('✅ Rankings merged successfully');
    
    // Show scoring breakdown for top 5
    console.log('\n📊 Top 5 Products (by composite score):');
    mergedProducts.slice(0, 5).forEach(product => {
        const r = product.ranking;
        console.log(`  ${r.finalRank}. ${product.title}`);
        console.log(`     Amazon: ${r.amazonScore.toFixed(1)} | Trends: ${r.trendsScore.toFixed(1)} | Composite: ${r.compositeScore.toFixed(1)}`);
        if (r.matchedTrendQuery) {
            console.log(`     Trend Match: "${r.matchedTrendQuery}"`);
        }
    });
    
    // Check for high-priority items (appear in both Amazon & Trends)
    const highPriority = mergedProducts.filter(p => p.ranking.trendsScore > 20);
    console.log(`\n⭐ High Priority Items (both Amazon + Trends): ${highPriority.length}`);
    
    return mergedProducts;
}

/**
 * Load Amazon products from file
 * @param {string} niche - Niche name
 * @returns {Array} Amazon products
 */
function loadAmazonProducts(niche) {
    const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Try multiple file patterns
    const patterns = [
        `${slug}-puppeteer.json`,
        `${slug}.json`,
        `${slug}-amazon.json`
    ];
    
    for (const pattern of patterns) {
        const filepath = path.join(CONFIG.DATA_DIR, pattern);
        if (fs.existsSync(filepath)) {
            console.log(`📂 Loading Amazon products from: ${pattern}`);
            const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            return data.products || data.data?.results || data;
        }
    }
    
    throw new Error(`No Amazon products file found for niche: ${niche}`);
}

/**
 * Load Google Trends data from file
 * @param {string} niche - Niche name
 * @returns {Array} Trends data
 */
function loadGoogleTrends(niche) {
    const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filepath = path.join(CONFIG.DATA_DIR, `${slug}-trends.json`);
    
    if (!fs.existsSync(filepath)) {
        console.warn(`⚠️ No trends file found: ${filepath}`);
        return [];
    }
    
    console.log(`📂 Loading Google Trends from: ${slug}-trends.json`);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    return data.trends || data;
}

/**
 * Save merged rankings to file
 * @param {string} niche - Niche name
 * @param {Array} products - Merged products
 */
function saveMergedRankings(niche, products) {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = path.join(CONFIG.OUTPUT_DIR, `${slug}-merged.json`);
    
    const data = {
        niche,
        mergedAt: new Date().toISOString(),
        scoringWeights: {
            amazon: CONFIG.AMAZON_WEIGHT,
            trends: CONFIG.TRENDS_WEIGHT
        },
        productCount: products.length,
        products
    };
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n💾 Saved merged rankings to: ${filename}`);
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const niche = args[0] || 'bluetooth headphones';
    
    console.log('🔄 Merge Rankings Script\n');
    console.log(`📦 Niche: ${niche}`);
    console.log(`⚖️  Scoring: Amazon (${CONFIG.AMAZON_WEIGHT * 100}%) + Trends (${CONFIG.TRENDS_WEIGHT * 100}%)\n`);
    
    try {
        // Load data
        const amazonProducts = loadAmazonProducts(niche);
        const trends = loadGoogleTrends(niche);
        
        if (amazonProducts.length === 0) {
            console.error('❌ No Amazon products found');
            process.exit(1);
        }
        
        // Merge rankings
        const mergedProducts = mergeRankings(amazonProducts, trends);
        
        // Save results
        saveMergedRankings(niche, mergedProducts);
        
        console.log('\n✅ Merge complete!');
        console.log(`📊 Final ranked products: ${mergedProducts.length}`);
        
    } catch (error) {
        console.error(`\n❌ Merge failed: ${error.message}`);
        process.exit(1);
    }
}

// Export functions
module.exports = {
    mergeRankings,
    calculateAmazonScore,
    calculateTrendsScore,
    calculateCompositeScore,
    loadAmazonProducts,
    loadGoogleTrends,
    saveMergedRankings
};

// Run if called directly
if (require.main === module) {
    main();
}
