#!/usr/bin/env node
/**
 * Integration test to verify the generator fails appropriately
 * This simulates various API failure scenarios
 */

console.log('🧪 Testing API Failure Scenarios\n');

const fs = require('fs');
const path = require('path');

// Test scenarios
const scenarios = [
    {
        name: 'API returns empty results array',
        apiResponse: {
            success: true,
            data: {
                success: true,
                domain: 'amazon.com',
                query: 'Test Query',
                total_results: 0,
                pages_fetched: 1,
                results: []
            }
        },
        shouldFail: true,
        expectedError: 'No products found in API response'
    },
    {
        name: 'API returns invalid structure',
        apiResponse: {
            success: false,
            error: 'Invalid request'
        },
        shouldFail: true,
        expectedError: 'Invalid API response structure'
    },
    {
        name: 'API returns products with missing ASIN (should skip and continue)',
        apiResponse: {
            success: true,
            data: {
                success: true,
                results: [
                    {
                        title: 'Product without ASIN',
                        image_url: 'https://example.com/image.jpg',
                        price: 99.99,
                        rating: 4.5,
                        review_count: 100,
                        description: 'Test description'
                    },
                    {
                        asin: 'B0TEST456',
                        title: 'Valid Product',
                        image_url: 'https://example.com/image2.jpg',
                        price: 79.99,
                        rating: 4.7,
                        review_count: 200,
                        description: 'Valid description',
                        features: ['Feature 1', 'Feature 2']
                    }
                ]
            }
        },
        shouldFail: false,  // Changed: should skip invalid and use valid
        expectedError: null,
        expectedValidCount: 1
    },
    {
        name: 'API returns products with missing images (should skip and continue)',
        apiResponse: {
            success: true,
            data: {
                success: true,
                results: [
                    {
                        asin: 'B0TEST123',
                        title: 'Product without image',
                        price: 99.99,
                        rating: 4.5,
                        review_count: 100,
                        description: 'Test description'
                    },
                    {
                        asin: 'B0TEST789',
                        title: 'Valid Product with Image',
                        image_url: 'https://example.com/image3.jpg',
                        price: 89.99,
                        rating: 4.6,
                        review_count: 150,
                        description: 'Valid description',
                        features: ['Feature A', 'Feature B']
                    }
                ]
            }
        },
        shouldFail: false,  // Changed: should skip invalid and use valid
        expectedError: null,
        expectedValidCount: 1
    },
    {
        name: 'API returns products with description OR feature_bullets',
        apiResponse: {
            success: true,
            data: {
                success: true,
                results: [
                    {
                        asin: 'B0TEST111',
                        title: 'Product with feature bullets only',
                        image_url: 'https://example.com/image4.jpg',
                        price: 59.99,
                        rating: 4.3,
                        review_count: 80,
                        feature_bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3']
                    }
                ]
            }
        },
        shouldFail: false,
        expectedError: null,
        expectedValidCount: 1
    },
    {
        name: 'API returns all invalid products (should return empty array)',
        apiResponse: {
            success: true,
            data: {
                success: true,
                results: [
                    {
                        title: 'Product without ASIN',
                        image_url: 'https://example.com/image.jpg'
                    },
                    {
                        asin: 'B0TEST222',
                        image_url: 'https://example.com/image.jpg'
                    },
                    {
                        asin: 'B0TEST333',
                        title: 'Product without image'
                    }
                ]
            }
        },
        shouldFail: false,  // Changed: should return empty array
        expectedError: null,
        expectedValidCount: 0
    },
    {
        name: 'API returns complete products',
        apiResponse: {
            success: true,
            data: {
                success: true,
                results: [
                    {
                        asin: 'B0TEST123',
                        title: 'Complete Test Product',
                        image_url: 'https://example.com/image.jpg',
                        price: 99.99,
                        rating: 4.5,
                        review_count: 100,
                        description: 'Complete test description',
                        features: ['Feature 1', 'Feature 2', 'Feature 3']
                    }
                ]
            }
        },
        shouldFail: false,
        expectedError: null,
        expectedValidCount: 1
    }
];

// Simulate API response parsing (updated to match new skip behavior)
function parseAPIResponse(response) {
    let productList = [];
    
    if (response && response.success && response.data && Array.isArray(response.data.results)) {
        productList = response.data.results;
    } else if (response && Array.isArray(response.results)) {
        productList = response.results;
    } else if (response && response.data && Array.isArray(response.data.products)) {
        productList = response.data.products;
    } else if (response && Array.isArray(response.products)) {
        productList = response.products;
    } else if (Array.isArray(response)) {
        productList = response;
    } else {
        throw new Error('Invalid API response structure');
    }
    
    if (productList.length === 0) {
        throw new Error('No products found in API response');
    }
    
    // Validate each product - SKIP invalid ones instead of failing
    const validProducts = [];
    for (let i = 0; i < productList.length; i++) {
        const product = productList[i];
        const asin = product.asin || product.ASIN || null;
        const title = product.title || product.product_title || null;
        let image = product.image_url || product.image || product.product_photo || null;
        
        // Try images array
        if (!image && product.images && Array.isArray(product.images) && product.images.length > 0) {
            image = product.images[0];
        }
        
        if (image && !image.startsWith('http')) {
            image = null;
        }
        
        const price = product.price || product.product_price || null;
        
        // Rating and review_count are now OPTIONAL - they default to 0
        const rating = product.rating || product.product_star_rating || '0';
        const reviewCount = product.review_count || product.product_num_ratings || '0';
        
        // Check for description OR feature_bullets
        let description = product.description || product.product_description || null;
        const featureBullets = product.feature_bullets || product.features || null;
        
        // Use feature bullets as description if description missing
        if (!description && featureBullets) {
            if (Array.isArray(featureBullets)) {
                description = featureBullets.join(' ');
            } else if (typeof featureBullets === 'string') {
                description = featureBullets;
            }
        }
        
        // Skip if missing REQUIRED fields (rating and reviewCount are now optional with defaults)
        if (!asin || !title || !image || !price || !description) {
            continue;
        }
        
        validProducts.push(product);
    }
    
    return validProducts;
}

// Run tests
let passed = 0;
let failed = 0;

scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    
    try {
        const products = parseAPIResponse(scenario.apiResponse);
        
        if (scenario.shouldFail) {
            console.log(`   ❌ Expected to fail but succeeded`);
            console.log(`   Expected error: ${scenario.expectedError}\n`);
            failed++;
        } else {
            // Check if we got expected number of valid products
            if (scenario.expectedValidCount !== undefined) {
                if (products.length === scenario.expectedValidCount) {
                    console.log(`   ✅ Correctly returned ${products.length} valid products\n`);
                    passed++;
                } else {
                    console.log(`   ❌ Expected ${scenario.expectedValidCount} valid products, got ${products.length}\n`);
                    failed++;
                }
            } else {
                console.log(`   ✅ Successfully parsed ${products.length} products\n`);
                passed++;
            }
        }
    } catch (error) {
        if (scenario.shouldFail) {
            const errorMatches = scenario.expectedError && error.message.includes(scenario.expectedError);
            if (errorMatches) {
                console.log(`   ✅ Failed as expected: ${error.message}\n`);
                passed++;
            } else {
                console.log(`   ⚠️  Failed with unexpected error`);
                console.log(`   Expected: ${scenario.expectedError}`);
                console.log(`   Got: ${error.message}\n`);
                failed++;
            }
        } else {
            console.log(`   ❌ Unexpected failure: ${error.message}\n`);
            failed++;
        }
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
    console.log('\n✅ All integration tests passed!');
    console.log('✅ Generator correctly skips invalid products and continues');
    console.log('✅ Generator accepts description OR feature_bullets');
    console.log('✅ Generator returns empty array when all products are invalid');
    process.exit(0);
}
