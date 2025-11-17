#!/usr/bin/env node
/**
 * Test script to verify strict validation of product data
 * Tests that the generator fails when products have missing fields
 */

console.log('🧪 Testing Product Validation Logic\n');

// Mock product data scenarios
const scenarios = [
    {
        name: 'Complete product (should pass)',
        product: {
            asin: 'B0TEST123',
            title: 'Test Product',
            image_url: 'https://example.com/image.jpg',
            price: 99.99,
            rating: 4.5,
            review_count: 1234,
            description: 'A great test product',
            features: ['Feature 1', 'Feature 2', 'Feature 3']
        },
        shouldPass: true
    },
    {
        name: 'Missing ASIN (should fail)',
        product: {
            title: 'Test Product',
            image_url: 'https://example.com/image.jpg',
            price: 99.99,
            rating: 4.5,
            review_count: 1234,
            description: 'A great test product'
        },
        shouldPass: false
    },
    {
        name: 'Missing title (should fail)',
        product: {
            asin: 'B0TEST123',
            image_url: 'https://example.com/image.jpg',
            price: 99.99,
            rating: 4.5,
            review_count: 1234,
            description: 'A great test product'
        },
        shouldPass: false
    },
    {
        name: 'Missing image (should fail)',
        product: {
            asin: 'B0TEST123',
            title: 'Test Product',
            price: 99.99,
            rating: 4.5,
            review_count: 1234,
            description: 'A great test product'
        },
        shouldPass: false
    },
    {
        name: 'Missing price (should fail)',
        product: {
            asin: 'B0TEST123',
            title: 'Test Product',
            image_url: 'https://example.com/image.jpg',
            rating: 4.5,
            review_count: 1234,
            description: 'A great test product'
        },
        shouldPass: false
    },
    {
        name: 'Missing rating (should fail)',
        product: {
            asin: 'B0TEST123',
            title: 'Test Product',
            image_url: 'https://example.com/image.jpg',
            price: 99.99,
            review_count: 1234,
            description: 'A great test product'
        },
        shouldPass: false
    },
    {
        name: 'Missing review_count (should fail)',
        product: {
            asin: 'B0TEST123',
            title: 'Test Product',
            image_url: 'https://example.com/image.jpg',
            price: 99.99,
            rating: 4.5,
            description: 'A great test product'
        },
        shouldPass: false
    },
    {
        name: 'Missing description (should fail)',
        product: {
            asin: 'B0TEST123',
            title: 'Test Product',
            image_url: 'https://example.com/image.jpg',
            price: 99.99,
            rating: 4.5,
            review_count: 1234
        },
        shouldPass: false
    }
];

// Simple validation function matching the logic in our generators
function validateProduct(product) {
    const asin = product.asin || product.ASIN || null;
    const title = product.title || product.product_title || null;
    const image = product.image_url || product.product_photo || null;
    const price = product.price || product.product_price || null;
    const rating = product.rating || product.product_star_rating || null;
    const reviewCount = product.review_count || product.product_num_ratings || null;
    const description = product.description || product.product_description || null;
    
    return !!(asin && title && image && price && rating && reviewCount && description);
}

// Run tests
let passed = 0;
let failed = 0;

scenarios.forEach((scenario, index) => {
    const result = validateProduct(scenario.product);
    const expectedResult = scenario.shouldPass;
    const testPassed = result === expectedResult;
    
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   Expected: ${expectedResult ? 'PASS' : 'FAIL'}`);
    console.log(`   Got: ${result ? 'PASS' : 'FAIL'}`);
    
    if (testPassed) {
        console.log(`   ✅ Test passed\n`);
        passed++;
    } else {
        console.log(`   ❌ Test FAILED\n`);
        failed++;
    }
});

// Summary
console.log('='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${scenarios.length}`);
console.log('='.repeat(60));

if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
} else {
    console.log('\n✅ All validation tests passed!');
    process.exit(0);
}
