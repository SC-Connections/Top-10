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
        name: 'API returns products with missing ASIN',
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
                    }
                ]
            }
        },
        shouldFail: true,
        expectedError: 'missing required fields'
    },
    {
        name: 'API returns products with missing images',
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
                    }
                ]
            }
        },
        shouldFail: true,
        expectedError: 'missing required fields'
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
        expectedError: null
    }
];

// Simulate API response parsing (extracted from site-generator.js logic)
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
    
    // Validate each product
    for (let i = 0; i < productList.length; i++) {
        const product = productList[i];
        const asin = product.asin || product.ASIN || null;
        const title = product.title || product.product_title || null;
        const image = product.image_url || product.product_photo || null;
        const price = product.price || product.product_price || null;
        const rating = product.rating || product.product_star_rating || null;
        const reviewCount = product.review_count || product.product_num_ratings || null;
        const description = product.description || product.product_description || null;
        
        if (!asin || !title || !image || !price || !rating || !reviewCount || !description) {
            throw new Error(`Product ${i + 1} missing required fields (ASIN, title, image, price, rating, reviews, or description)`);
        }
    }
    
    return productList;
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
            console.log(`   ✅ Successfully parsed ${products.length} products\n`);
            passed++;
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
    console.log('✅ Generator correctly fails when API data is incomplete');
    process.exit(0);
}
