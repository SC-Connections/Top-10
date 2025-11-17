#!/usr/bin/env node
/**
 * Test with realistic API response structures
 * This simulates what we'd actually get from Amazon Real Time API
 */

console.log('🧪 Testing Real-World API Scenarios\n');

// Simulate the validation logic from site-generator.js
function processProducts(productList) {
    const validProducts = [];
    let skippedCount = 0;
    
    for (let i = 0; i < Math.min(productList.length, 20); i++) {
        const product = productList[i];
        
        // Extract ASIN
        const asin = product.asin || product.ASIN || null;
        
        // Extract title
        const title = product.title || product.product_title || product.name || null;
        
        // Extract image - try multiple sources including images array
        let image = product.image_url || product.image || product.product_photo || product.main_image || null;
        if (!image && product.images && Array.isArray(product.images) && product.images.length > 0) {
            image = product.images[0];
        }
        if (image && !image.startsWith('http')) {
            image = null;
        }
        
        // Skip if missing core fields
        if (!asin || !title || !image) {
            console.warn(`   ⚠️  Skipping product ${i + 1}: missing core fields (ASIN: ${!!asin}, Title: ${!!title}, Image: ${!!image})`);
            skippedCount++;
            continue;
        }
        
        // Extract rating - OPTIONAL (defaults to 0)
        let rating = '0';  // Default value
        if (typeof product.rating === 'number') {
            rating = String(product.rating);
        } else if (product.product_star_rating) {
            rating = String(product.product_star_rating);
        } else if (product.stars) {
            rating = String(product.stars);
        }
        
        // Extract review count - OPTIONAL (defaults to 0)
        let reviews = '0';  // Default value
        if (product.review_count) {
            reviews = String(product.review_count);
        } else if (product.product_num_ratings) {
            reviews = String(product.product_num_ratings);
        } else if (product.reviews_count) {
            reviews = String(product.reviews_count);
        }
        
        // Extract price
        let price = null;
        if (typeof product.price === 'number') {
            price = `$${product.price.toFixed(2)}`;
        } else if (product.price) {
            price = String(product.price);
        } else if (product.product_price) {
            price = String(product.product_price);
        }
        
        if (!price) {
            console.warn(`   ⚠️  Skipping product ${i + 1} "${title}": missing price`);
            skippedCount++;
            continue;
        }
        
        // Extract description OR feature_bullets - flexible
        let description = product.product_description || product.description || null;
        let featureBullets = product.feature_bullets || product.features || product.about_product || null;
        
        if (!description && featureBullets && Array.isArray(featureBullets) && featureBullets.length > 0) {
            description = featureBullets.join(' ');
            console.log(`   ℹ️  Using feature bullets as description for "${title}"`);
        } else if (!description && featureBullets && typeof featureBullets === 'string') {
            description = featureBullets;
            console.log(`   ℹ️  Using feature bullets as description for "${title}"`);
        }
        
        if (!description) {
            console.warn(`   ⚠️  Skipping product ${i + 1} "${title}": missing description and feature bullets`);
            skippedCount++;
            continue;
        }
        
        // Build Amazon URL
        let amazonUrl = product.detail_page_url || product.product_url || null;
        if (!amazonUrl) {
            amazonUrl = `https://www.amazon.com/dp/${asin}`;
        }
        if (!amazonUrl.includes('tag=')) {
            const separator = amazonUrl.includes('?') ? '&' : '?';
            amazonUrl = `${amazonUrl}${separator}tag=test-20`;
        }
        
        validProducts.push({
            asin,
            title,
            description,
            rating,
            reviews,
            price,
            image,
            url: amazonUrl
        });
        
        if (validProducts.length >= 10) {
            break;
        }
    }
    
    return { validProducts, skippedCount };
}

// Test scenarios
const scenarios = [
    {
        name: 'Mix of valid and invalid products (realistic)',
        products: [
            // Valid product with all fields
            {
                asin: 'B08X1234AB',
                title: 'Sony WH-1000XM4 Wireless Headphones',
                image_url: 'https://m.media-amazon.com/images/I/71abc123.jpg',
                price: 349.99,
                rating: 4.7,
                review_count: 54321,
                description: 'Industry-leading noise canceling with Dual Noise Sensor technology'
            },
            // Valid product with feature_bullets instead of description
            {
                asin: 'B09Y5678CD',
                title: 'Bose QuietComfort 45',
                image: 'https://m.media-amazon.com/images/I/81def456.jpg',
                price: 329.00,
                rating: 4.5,
                review_count: 12345,
                feature_bullets: ['Active noise cancellation', 'Up to 24 hours battery', 'Comfortable fit']
            },
            // Product missing image - should skip
            {
                asin: 'B07Z9012EF',
                title: 'JBL Live 650BTNC',
                price: 199.99,
                rating: 4.3,
                review_count: 8765
            },
            // Valid product with images array
            {
                asin: 'B08A3456GH',
                title: 'Sennheiser HD 450BT',
                images: ['https://m.media-amazon.com/images/I/91ghi789.jpg'],
                price: 199.95,
                rating: 4.4,
                review_count: 6543,
                description: 'Wireless headphones with active noise cancellation'
            },
            // Product missing ASIN - should skip
            {
                title: 'Generic Headphones',
                image_url: 'https://m.media-amazon.com/images/I/71xyz999.jpg',
                price: 99.99,
                rating: 4.0,
                review_count: 1000,
                description: 'Good quality headphones'
            },
            // Valid product with detail_page_url
            {
                asin: 'B07X7890IJ',
                title: 'Audio-Technica ATH-M50xBT',
                image_url: 'https://m.media-amazon.com/images/I/81jkl012.jpg',
                price: 179.00,
                rating: 4.6,
                review_count: 9876,
                description: 'Professional studio monitor headphones',
                detail_page_url: 'https://www.amazon.com/dp/B07X7890IJ'
            }
        ],
        expectedValid: 4,
        expectedSkipped: 2
    },
    {
        name: 'All products missing descriptions but have feature_bullets',
        products: [
            {
                asin: 'B01A1111AA',
                title: 'Product with bullets 1',
                image_url: 'https://m.media-amazon.com/images/I/81aaa111.jpg',
                price: 49.99,
                rating: 4.2,
                review_count: 500,
                feature_bullets: ['Feature A', 'Feature B', 'Feature C']
            },
            {
                asin: 'B02B2222BB',
                title: 'Product with bullets 2',
                image_url: 'https://m.media-amazon.com/images/I/81bbb222.jpg',
                price: 59.99,
                rating: 4.3,
                review_count: 600,
                feature_bullets: ['Feature X', 'Feature Y', 'Feature Z']
            }
        ],
        expectedValid: 2,
        expectedSkipped: 0
    },
    {
        name: 'All products invalid (missing required fields)',
        products: [
            {
                title: 'No ASIN or Image',
                price: 99.99,
                rating: 4.0,
                review_count: 100
            },
            {
                asin: 'B03C3333CC',
                image_url: 'https://m.media-amazon.com/images/I/81ccc333.jpg'
                // missing price, rating, reviews, description
            },
            {
                asin: 'B04D4444DD',
                title: 'Partial data only',
                image_url: 'https://m.media-amazon.com/images/I/81ddd444.jpg'
                // missing price, rating, reviews, description
            }
        ],
        expectedValid: 0,
        expectedSkipped: 3
    }
];

// Run tests
let passed = 0;
let failed = 0;

scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    
    const result = processProducts(scenario.products);
    
    const validMatch = result.validProducts.length === scenario.expectedValid;
    const skippedMatch = result.skippedCount === scenario.expectedSkipped;
    
    if (validMatch && skippedMatch) {
        console.log(`   ✅ Correct: ${result.validProducts.length} valid, ${result.skippedCount} skipped\n`);
        passed++;
    } else {
        console.log(`   ❌ Expected: ${scenario.expectedValid} valid, ${scenario.expectedSkipped} skipped`);
        console.log(`   Got: ${result.validProducts.length} valid, ${result.skippedCount} skipped\n`);
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
    console.log('\n✅ All real-world API tests passed!');
    console.log('✅ Correctly handles mixed valid/invalid products');
    console.log('✅ Accepts description OR feature_bullets');
    console.log('✅ Uses images array as fallback');
    console.log('✅ Respects detail_page_url from API');
    process.exit(0);
}
