#!/usr/bin/env node
/**
 * Integration Test for Automation Features
 * Tests the new automation scripts without requiring external APIs
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Running Automation Feature Tests\n');

// Test 1: Auto-fix validation module
console.log('Test 1: Auto-fix Validation Module');
try {
    const autoFix = require('./scripts/auto-fix-validation.js');
    
    // Test auto-fix brand
    const testProduct = { asin: 'TEST123', brand: '', title: 'Test Product' };
    const fixed = autoFix.autoFixBrand(testProduct, 'TEST123');
    
    if (fixed.brand === 'Unknown') {
        console.log('  ✅ Brand auto-fix works correctly');
    } else {
        console.log('  ❌ Brand auto-fix failed');
        process.exit(1);
    }
} catch (err) {
    console.log('  ❌ Auto-fix module failed:', err.message);
    process.exit(1);
}

// Test 2: Merge rankings module
console.log('\nTest 2: Merge Rankings Module');
try {
    const merge = require('./scripts/merge-rankings.js');
    
    // Test scoring functions
    const amazonScore = merge.calculateAmazonScore(1, 10);
    const trendsScore = merge.calculateTrendsScore(75);
    const composite = merge.calculateCompositeScore(amazonScore, trendsScore);
    
    if (amazonScore === 100 && trendsScore === 75 && composite === 90) {
        console.log('  ✅ Scoring calculations work correctly');
        console.log(`     Amazon: ${amazonScore}, Trends: ${trendsScore}, Composite: ${composite}`);
    } else {
        console.log('  ❌ Scoring calculations failed');
        console.log(`     Expected: Amazon=100, Trends=75, Composite=90`);
        console.log(`     Got: Amazon=${amazonScore}, Trends=${trendsScore}, Composite=${composite}`);
        process.exit(1);
    }
} catch (err) {
    console.log('  ❌ Merge rankings module failed:', err.message);
    process.exit(1);
}

// Test 3: Review generator module (template mode)
console.log('\nTest 3: Review Generator Module');
try {
    const reviews = require('./scripts/generate-reviews.js');
    
    // Test with mock product
    const mockProduct = {
        title: 'Sony WH-1000XM5',
        brand: 'Sony',
        rating: '4.5',
        reviews: '1234',
        price: '$299.99',
        features: ['Noise cancelling', 'Wireless', 'Long battery life']
    };
    
    reviews.generateProductReview(mockProduct, 'headphones', 1).then(review => {
        if (review && review.content && review.title) {
            console.log('  ✅ Review generation works correctly');
            console.log(`     Title: ${review.title}`);
            console.log(`     Content length: ${review.content.length} chars`);
        } else {
            console.log('  ❌ Review generation failed');
            process.exit(1);
        }
    }).catch(err => {
        console.log('  ❌ Review generation failed:', err.message);
        process.exit(1);
    });
} catch (err) {
    console.log('  ❌ Review generator module failed:', err.message);
    process.exit(1);
}

// Test 4: Scraper modules exist
console.log('\nTest 4: Scraper Modules');
try {
    const amazonScraper = require('./scripts/scrape-amazon.js');
    const trendsScraper = require('./scripts/scrape-google-trends.js');
    
    if (amazonScraper && trendsScraper) {
        console.log('  ✅ Scraper modules loaded successfully');
        console.log('     - scrape-amazon.js: OK');
        console.log('     - scrape-google-trends.js: OK');
    } else {
        console.log('  ❌ Scraper modules failed to load');
        process.exit(1);
    }
} catch (err) {
    console.log('  ❌ Scraper modules failed:', err.message);
    process.exit(1);
}

// Test 5: Package.json configuration
console.log('\nTest 5: Package Configuration');
try {
    const pkg = require('./package.json');
    
    const hasPuppeteer = pkg.dependencies.puppeteer !== undefined;
    const hasOpenAI = pkg.dependencies.openai !== undefined;
    const skipDownload = pkg.puppeteer?.skipDownload === 'true';
    
    if (hasPuppeteer && hasOpenAI && skipDownload) {
        console.log('  ✅ Package.json configured correctly');
        console.log('     - Puppeteer dependency: ✓');
        console.log('     - OpenAI dependency: ✓');
        console.log('     - Skip Chrome download: ✓');
    } else {
        console.log('  ❌ Package.json configuration incomplete');
        process.exit(1);
    }
} catch (err) {
    console.log('  ❌ Package configuration check failed:', err.message);
    process.exit(1);
}

// Wait for async tests to complete
setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log('  ✓ Auto-fix validation works');
    console.log('  ✓ Ranking merger calculates scores correctly');
    console.log('  ✓ Review generator creates content');
    console.log('  ✓ Scraper modules load successfully');
    console.log('  ✓ Package configuration is correct');
    console.log('\n🎉 Automation features are ready to use!');
    console.log('\n📌 Note: Full scraping tests require:');
    console.log('  - RAPIDAPI_KEY environment variable');
    console.log('  - OPENAI_API_KEY for AI features (optional)');
    console.log('  - Network access to Amazon and Google Trends');
}, 2000);
