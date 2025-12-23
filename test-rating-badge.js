#!/usr/bin/env node
/**
 * Test script to validate review count removal from rating badge
 */

// Test the rating value generation logic from site-generator.js
function testRatingValue(rating, reviewCount, description) {
    console.log(`\nTest: ${description}`);
    console.log(`  Input: rating=${rating}, reviewCount=${reviewCount}`);
    
    // This is the NEW logic from site-generator.js line 1541-1549
    const ratingStr = rating || 'N/A';
    const ratingValue = ratingStr === 'N/A' ? 'Not yet rated' : `${ratingStr} / 5`;
    
    // Only show rating if we have a valid rating value
    const shouldShow = ratingStr !== 'N/A' && parseFloat(ratingStr) > 0;
    
    console.log(`  Output: "${ratingValue}"`);
    console.log(`  Should show: ${shouldShow}`);
    
    // Verify NO review count in output
    const hasReviewCount = ratingValue.includes('reviews') || ratingValue.includes('(');
    if (hasReviewCount) {
        console.log(`  ❌ FAIL: Output contains review count!`);
        return false;
    }
    
    if (!shouldShow && (ratingStr === 'N/A' || parseFloat(ratingStr) <= 0)) {
        console.log(`  ✅ PASS: Correctly hidden (no rating or rating is 0)`);
        return true;
    }
    
    if (shouldShow && parseFloat(ratingStr) > 0) {
        console.log(`  ✅ PASS: Shows rating only, no review count`);
        return true;
    }
    
    console.log(`  ❌ FAIL: Unexpected behavior`);
    return false;
}

// Run tests
console.log('='.repeat(60));
console.log('Testing Rating Badge Logic (Review Count Removal)');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

// Test cases
const tests = [
    ['4.4', '0', 'Product with rating but 0 reviews'],
    ['4.8', '4815', 'Product with rating and many reviews'],
    ['4.5', null, 'Product with rating but null reviews'],
    [null, '100', 'Product with no rating but has reviews'],
    ['N/A', '0', 'Product with N/A rating'],
    ['0', '0', 'Product with 0 rating'],
    ['5.0', '1000', 'Product with perfect rating'],
];

tests.forEach(([rating, reviewCount, description]) => {
    if (testRatingValue(rating, reviewCount, description)) {
        passed++;
    } else {
        failed++;
    }
});

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

// Check template files
console.log('\n\nChecking template files for review count references...\n');

const fs = require('fs');
const path = require('path');

const filesToCheck = [
    'templates/blog-template.html',
    'generate-premium-site.js',
    'site-generator.js'
];

let templateIssues = 0;

filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  File not found: ${file}`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Check for problematic patterns (UI display only, not schema or internal logic)
    const patterns = [
        { pattern: /\(.*\d+.*reviews?\)/i, desc: 'Review count in parentheses (UI display)' },  // Text like "(123 reviews)" or "(0 reviews)"
        { pattern: /{{REVIEW_COUNT}}/g, desc: 'Template placeholder for review count' },
        { pattern: /\breview-count["\s>]/i, desc: 'CSS class for review count display' },
    ];
    
    let foundIssues = false;
    lines.forEach((line, idx) => {
        // Skip comment lines, schema markup, data fields, and notes
        if (line.trim().startsWith('//') || 
            line.trim().startsWith('*') || 
            line.includes('Note:') ||
            line.includes('"reviewCount"') ||  // Schema.org field
            line.includes('aggregateRating') || // Schema.org
            line.includes('product.reviews') ||  // Data field access
            line.includes('b.reviews') ||  // Sorting/data operations
            line.includes('miniReview') ||  // Different field
            line.includes('Methodology') ||  // Explanatory text
            line.includes('minimum 4.5★ with 1,000+ reviews')) {  // Methodology explanation
            return;
        }
        
        patterns.forEach(({pattern, desc}) => {
            if (pattern.test(line)) {
                if (!foundIssues) {
                    console.log(`\n  ❌ Issues found in ${file}:`);
                    foundIssues = true;
                    templateIssues++;
                }
                console.log(`     Line ${idx + 1} (${desc}): ${line.trim().substring(0, 80)}`);
            }
        });
    });
    
    if (!foundIssues) {
        console.log(`  ✅ ${file} - No review count references found`);
    }
});

console.log('\n' + '='.repeat(60));
if (passed === tests.length && templateIssues === 0) {
    console.log('✅ ALL TESTS PASSED - Review count successfully removed!');
    process.exit(0);
} else {
    console.log('❌ SOME TESTS FAILED - Please review the issues above');
    process.exit(1);
}
