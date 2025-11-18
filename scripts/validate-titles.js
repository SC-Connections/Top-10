#!/usr/bin/env node
/**
 * Validation Script for Product Title Cleanup
 * Ensures all generated products meet the optimization requirements
 */

const fs = require('fs');
const path = require('path');

const VALIDATION_RULES = {
    MAX_TITLE_WORDS: 6,
    MIN_TITLE_WORDS: 2,
    PREMIUM_BRANDS: ['sony', 'apple', 'beats', 'bose', 'sennheiser']
};

/**
 * Check if a title is too generic
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
 * Get price category
 */
function getPriceCategory(priceStr) {
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    
    if (price > 200) return 'premium';
    if (price > 80) return 'mid-range';
    return 'budget';
}

/**
 * Validate a niche site's products
 * @param {string} nichePath - Path to niche directory
 * @returns {object} Validation results
 */
function validateNicheSite(nichePath) {
    const results = {
        niche: path.basename(nichePath),
        valid: true,
        errors: [],
        warnings: [],
        stats: {
            totalProducts: 0,
            premiumCount: 0,
            midRangeCount: 0,
            budgetCount: 0,
            maxTitleWords: 0,
            genericTitles: 0
        }
    };

    // Check if index.html exists
    const indexPath = path.join(nichePath, 'index.html');
    if (!fs.existsSync(indexPath)) {
        results.valid = false;
        results.errors.push('index.html not found');
        return results;
    }

    // Load and parse index.html
    const html = fs.readFileSync(indexPath, 'utf8');

    // Extract product titles from HTML
    const titlePattern = /<h3 class="product-title">([^<]+)<\/h3>/g;
    let match;
    const titles = [];

    while ((match = titlePattern.exec(html)) !== null) {
        titles.push(match[1]);
    }

    results.stats.totalProducts = titles.length;

    // Validate each title
    titles.forEach((title, index) => {
        const rank = index + 1;
        const words = title.split(/\s+/);
        const wordCount = words.length;

        // Update max word count
        if (wordCount > results.stats.maxTitleWords) {
            results.stats.maxTitleWords = wordCount;
        }

        // Check: Max 6 words
        if (wordCount > VALIDATION_RULES.MAX_TITLE_WORDS) {
            results.valid = false;
            results.errors.push(`Product #${rank}: Title exceeds 6 words (${wordCount}): "${title}"`);
        }

        // Check: Min 2 words (brand + model)
        if (wordCount < VALIDATION_RULES.MIN_TITLE_WORDS) {
            results.valid = false;
            results.errors.push(`Product #${rank}: Title too short (${wordCount}): "${title}"`);
        }

        // Check: Not generic
        if (isGenericTitle(title)) {
            results.stats.genericTitles++;
            results.errors.push(`Product #${rank}: Generic title detected: "${title}"`);
            results.valid = false;
        }
    });

    // Extract prices and categorize
    const pricePattern = /<span class="price-value">([^<]+)<\/span>/g;
    const prices = [];

    while ((match = pricePattern.exec(html)) !== null) {
        prices.push(match[1]);
    }

    prices.forEach(price => {
        const category = getPriceCategory(price);
        if (category === 'premium') results.stats.premiumCount++;
        else if (category === 'mid-range') results.stats.midRangeCount++;
        else results.stats.budgetCount++;
    });

    // Check: At least 1 premium and 1 mid-range
    if (results.stats.premiumCount === 0) {
        results.warnings.push('No premium products ($200+) found');
    }

    if (results.stats.midRangeCount === 0) {
        results.warnings.push('No mid-range products ($80-$200) found');
    }

    // Check for premium brands
    const hasPremiumBrand = VALIDATION_RULES.PREMIUM_BRANDS.some(brand => 
        html.toLowerCase().includes(brand)
    );

    if (!hasPremiumBrand) {
        results.warnings.push('No premium brands (Sony, Apple, Beats, Bose, Sennheiser) detected');
        
        // Check if note is displayed
        if (!html.includes('No high-end models detected')) {
            results.warnings.push('Premium brand note not displayed');
        }
    }

    return results;
}

/**
 * Main validation function
 */
function main() {
    console.log('🔍 Validating Product Title Cleanup Implementation\n');
    console.log('='.repeat(60));

    const niches = [];
    const entries = fs.readdirSync(__dirname + '/..');

    // Find niche directories
    for (const entry of entries) {
        const fullPath = path.join(__dirname, '..', entry);
        if (fs.statSync(fullPath).isDirectory() && 
            !entry.startsWith('.') && 
            !['node_modules', 'data', 'templates', 'scripts', 'src', 'logs'].includes(entry) &&
            fs.existsSync(path.join(fullPath, 'index.html'))) {
            niches.push(fullPath);
        }
    }

    console.log(`Found ${niches.length} niche site(s) to validate\n`);

    let allValid = true;
    const allResults = [];

    // Validate each niche
    niches.forEach(nichePath => {
        console.log(`\n📦 Validating: ${path.basename(nichePath)}`);
        console.log('-'.repeat(60));

        const results = validateNicheSite(nichePath);
        allResults.push(results);

        // Display results
        console.log(`Products: ${results.stats.totalProducts}`);
        console.log(`Max title words: ${results.stats.maxTitleWords}`);
        console.log(`Premium: ${results.stats.premiumCount}, Mid-Range: ${results.stats.midRangeCount}, Budget: ${results.stats.budgetCount}`);

        if (results.errors.length > 0) {
            console.log('\n❌ Errors:');
            results.errors.forEach(err => console.log(`   - ${err}`));
            allValid = false;
        }

        if (results.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            results.warnings.forEach(warn => console.log(`   - ${warn}`));
        }

        if (results.valid && results.warnings.length === 0) {
            console.log('\n✅ All checks passed!');
        }
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const totalErrors = allResults.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = allResults.reduce((sum, r) => sum + r.warnings.length, 0);

    console.log(`Sites validated: ${niches.length}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Warnings: ${totalWarnings}`);

    if (allValid) {
        console.log('\n✅ All sites passed validation!');
        process.exit(0);
    } else {
        console.log('\n❌ Validation failed - please review errors above');
        process.exit(1);
    }
}

// Run validation
if (require.main === module) {
    main();
}

module.exports = { validateNicheSite };
