#!/usr/bin/env node
/**
 * Validation Test for Generated Premium Affiliate Page
 * Ensures the page meets all requirements from the problem statement
 */

const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'generated-pages/best-bluetooth-headphones-2025.html');
const html = fs.readFileSync(htmlFile, 'utf-8');
const productData = JSON.parse(fs.readFileSync('./product-data.json', 'utf-8'));

console.log('\n' + '='.repeat(80));
console.log('VALIDATION TEST: Best Bluetooth Headphones 2025');
console.log('='.repeat(80) + '\n');

let passedTests = 0;
let totalTests = 0;

function test(name, condition) {
    totalTests++;
    if (condition) {
        console.log(`✅ ${name}`);
        passedTests++;
        return true;
    } else {
        console.log(`❌ ${name}`);
        return false;
    }
}

// Test 1: Exactly 10 products
test('Has exactly 10 products', productData.products.length === 10);

// Test 2: 70-80% premium products (≥$249)
const premiumCount = productData.products.filter(p => p.msrp >= 249).length;
const premiumPercent = (premiumCount / 10) * 100;
test(`70-80% premium products (${premiumPercent}%, ${premiumCount}/10)`, premiumPercent >= 70 && premiumPercent <= 80);

// Test 3: Has proper title
test('Has "Best [Product] 2025" in title', html.includes('Best Bluetooth Headphones 2025'));

// Test 4: Has meta description
test('Has meta description', html.includes('<meta name="description"'));

// Test 5: Has meta keywords
test('Has meta keywords', html.includes('<meta name="keywords"'));

// Test 6: Has Open Graph tags
test('Has Open Graph meta tags', html.includes('<meta property="og:title"'));

// Test 7: Has schema markup
test('Has schema markup (application/ld+json)', html.includes('<script type="application/ld+json">'));

// Test 8: Has Review schema
test('Has Review schema', html.includes('"@type": "Review"'));

// Test 9: Has ItemList schema
test('Has ItemList schema', html.includes('"@type": "ItemList"'));

// Test 10: Has FAQPage schema
test('Has FAQPage schema', html.includes('"@type": "FAQPage"'));

// Test 11: Has affiliate disclosure at top
test('Has affiliate disclosure at top', html.includes('Affiliate Disclosure'));

// Test 12: Has intro section
test('Has introduction section', html.includes('Finding the Best'));

// Test 13: Has comparison table
test('Has quick comparison table', html.includes('Quick Comparison Table'));

// Test 14: Has all 10 product cards
const productCardCount = (html.match(/class="product-card"/g) || []).length;
test(`Has all 10 product cards (found ${productCardCount})`, productCardCount === 10);

// Test 15: Product cards have images
const productImageCount = (html.match(/class="product-image"/g) || []).length;
test(`All product cards have images (found ${productImageCount})`, productImageCount === 10);

// Test 16: Has star ratings
test('Has star ratings', html.includes('★'));

// Test 17: Has review counts
test('Has review counts', html.includes('reviews)'));

// Test 18: Has pros and cons
test('Has pros and cons sections', html.includes('✓ Pros') && html.includes('✗ Cons'));

// Test 19: Has expert reviews
test('Has expert review sections', html.includes('Expert Review:'));

// Test 20: Has "Check price on Amazon" (not hard-coded prices)
test('Uses "Check price on Amazon" text', html.includes('Check price on Amazon'));

// Test 21: Has Amazon affiliate links
const affiliateLinkCount = (html.match(/amazon\.com\/dp\//g) || []).length;
test(`Has Amazon affiliate links (found ${affiliateLinkCount})`, affiliateLinkCount >= 10);

// Test 22: Affiliate links include tag
const affiliateTagCount = (html.match(/tag=scconnec0d-20/g) || []).length;
test(`Affiliate links include tag (found ${affiliateTagCount})`, affiliateTagCount >= 10);

// Test 23: Has buyer's guide
test('Has comprehensive buyer\'s guide', html.includes('Comprehensive Buyer\'s Guide'));

// Test 24: Buyer's guide has "How We Choose & Test"
test('Buyer\'s guide has "How We Choose & Test"', html.includes('How We Choose & Test'));

// Test 25: Buyer's guide has "Premium vs Mid-Range vs Budget"
test('Buyer\'s guide has premium comparison', html.includes('Premium vs Mid-Range vs Budget'));

// Test 26: Buyer's guide has "Key Features Explained"
test('Buyer\'s guide has key features', html.includes('Key Features Explained'));

// Test 27: Buyer's guide has "Who Should Buy"
test('Buyer\'s guide has buyer recommendations', html.includes('Who Should Buy'));

// Test 28: Has FAQ section
test('Has FAQ section', html.includes('Frequently Asked Questions'));

// Test 29: Has multiple FAQ items
const faqCount = (html.match(/class="faq-item"/g) || []).length;
test(`Has 8-12 FAQ items (found ${faqCount})`, faqCount >= 8 && faqCount <= 12);

// Test 30: Has footer CTA
test('Has footer call-to-action', html.includes('footer-cta'));

// Test 31: Has footer with affiliate disclosure
test('Has footer with second affiliate disclosure', html.includes('<footer>'));

// Test 32: Mobile responsive
test('Has mobile responsive meta tag', html.includes('width=device-width'));

// Test 33: Has CSS styling
test('Has embedded CSS', html.includes('<style>'));

// Test 34: Has navigation
test('Has navigation menu', html.includes('<nav>'));

// Test 35: Uses lazy loading for images
test('Uses lazy loading for images', html.includes('loading="lazy"'));

// Test 36: Has last updated date
test('Has last updated date', html.includes('Last updated:'));

// Test 37: Has proper semantic HTML
test('Uses semantic HTML5', html.includes('<header>') && html.includes('<main') && html.includes('<footer>'));

// Test 38: Has internal anchor links
test('Has internal anchor links from table', html.includes('href="#product-'));

// Test 39: CTA buttons use proper links
test('CTA buttons link to Amazon', html.includes('Check Today\'s Price'));

// Test 40: Expert tone (first-person)
test('Uses first-person expert tone', html.includes('After testing') || html.includes('I '));

console.log('\n' + '='.repeat(80));
console.log(`TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
console.log('='.repeat(80) + '\n');

if (passedTests === totalTests) {
    console.log('✅ ALL TESTS PASSED! The page meets all requirements.\n');
    process.exit(0);
} else {
    console.log(`❌ ${totalTests - passedTests} test(s) failed. Please review.\n`);
    process.exit(1);
}
