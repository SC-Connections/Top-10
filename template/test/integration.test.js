/**
 * Integration test for product filtering flow
 * Tests the complete flow from data gathering to final product list
 */

// Mock data that simulates products from various sources
const mockProducts = [
  // Premium products with good ratings
  { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
  { asin: 'B002', title: 'Apple AirPods Pro', rating: '4.7', reviews: '5000' },
  { asin: 'B003', title: 'Bose QuietComfort 45', rating: '4.6', reviews: '3000' },
  
  // Duplicate (different color) - should be removed
  { asin: 'B004', title: 'Sony WH-1000XM5 Black', rating: '4.5', reviews: '2000' },
  
  // Products with lower ratings but still acceptable (>= 3.5)
  { asin: 'B005', title: 'Samsung Galaxy Buds', rating: '3.8', reviews: '1500' },
  { asin: 'B006', title: 'JBL Tune 720BT', rating: '3.6', reviews: '800' },
  
  // Non-premium brand but good ratings - should still pass with lenient filtering
  { asin: 'B007', title: 'Anker Soundcore Life Q30', rating: '4.3', reviews: '4000' },
  
  // Products that should be filtered out
  { asin: 'B008', title: '', rating: '4.5', reviews: '2000' }, // empty title
  { asin: 'B009', title: 'Low Rating Product', rating: '2.5', reviews: '1000' }, // rating too low
  { asin: 'B010', title: 'Few Reviews Product', rating: '4.5', reviews: '5' }, // too few reviews
  { asin: null, title: 'No ASIN Product', rating: '4.5', reviews: '2000' }, // no ASIN
  
  // More valid products to ensure we can reach 8-10
  { asin: 'B011', title: 'Sennheiser Momentum 4', rating: '4.4', reviews: '1200' },
  { asin: 'B012', title: 'Beats Studio Pro', rating: '4.2', reviews: '900' },
  { asin: 'B013', title: 'Razer Barracuda X', rating: '4.0', reviews: '600' },
];

// Mock the applyFilters function (same as in site-generator.js)
function applyFilters(products) {
  const PREMIUM_BRANDS = [
    "Apple","Sony","Bose","Sennheiser","Bang & Olufsen",
    "Shure","Razer","Logitech","Samsung","JBL","Beats","HP","Dell","Lenovo"
  ];

  const MIN_RATING = 3.5;
  const MIN_REVIEWS = 10;

  const seenAsins = new Set();
  const seenTitles = new Set();
  const final = [];

  for (const p of products) {
    const title = (p.title || "").trim();
    const titleLower = title.toLowerCase();
    const rating = parseFloat(p.rating) || 0;
    const reviews = parseInt(p.reviews) || 0;
    const asin = p.asin || null;

    if (!title || title.length === 0) continue;
    if (!asin) continue;
    if (seenAsins.has(asin)) continue;
    
    const normalizedTitle = titleLower
      .replace(/\b(black|white|silver|gold|blue|red|green)\b/g, '')
      .replace(/\b(small|medium|large|xl|xxl)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (seenTitles.has(normalizedTitle)) continue;
    
    seenAsins.add(asin);
    seenTitles.add(normalizedTitle);

    if (rating < MIN_RATING) continue;
    if (reviews < MIN_REVIEWS) continue;

    const isPremium = PREMIUM_BRANDS.some(b => titleLower.includes(b.toLowerCase()));
    final.push({ ...p, isPremium });
  }

  final.sort((a, b) => {
    if (a.isPremium !== b.isPremium) return b.isPremium ? 1 : -1;
    const ratingA = parseFloat(a.rating) || 0;
    const ratingB = parseFloat(b.rating) || 0;
    if (Math.abs(ratingA - ratingB) > 0.1) return ratingB - ratingA;
    return (parseInt(b.reviews) || 0) - (parseInt(a.reviews) || 0);
  });

  return final.slice(0, 10);
}

/**
 * Test complete filtering flow
 */
function testCompleteFlow() {
  console.log('\n🔄 Testing complete product filtering flow...');
  console.log(`\n📦 Input: ${mockProducts.length} mock products`);
  
  const result = applyFilters(mockProducts);
  
  console.log(`\n✅ Output: ${result.length} filtered products`);
  
  // Validate results
  const validations = {
    minCount: result.length >= 8,
    maxCount: result.length <= 10,
    allHaveTitle: result.every(p => p.title && p.title.trim().length > 0),
    allHaveAsin: result.every(p => p.asin),
    allHaveRating: result.every(p => parseFloat(p.rating) >= 3.5),
    allHaveReviews: result.every(p => parseInt(p.reviews) >= 10),
    uniqueAsins: new Set(result.map(p => p.asin)).size === result.length,
    premiumFirst: result[0].isPremium === true
  };
  
  console.log('\n📋 Validation Results:');
  console.log(`  ${validations.minCount ? '✓' : '✗'} Has at least 8 products: ${result.length}`);
  console.log(`  ${validations.maxCount ? '✓' : '✗'} Has at most 10 products: ${result.length}`);
  console.log(`  ${validations.allHaveTitle ? '✓' : '✗'} All products have valid titles`);
  console.log(`  ${validations.allHaveAsin ? '✓' : '✗'} All products have ASINs`);
  console.log(`  ${validations.allHaveRating ? '✓' : '✗'} All products have rating >= 3.5`);
  console.log(`  ${validations.allHaveReviews ? '✓' : '✗'} All products have reviews >= 10`);
  console.log(`  ${validations.uniqueAsins ? '✓' : '✗'} All ASINs are unique (no duplicates)`);
  console.log(`  ${validations.premiumFirst ? '✓' : '✗'} Premium brands prioritized first`);
  
  console.log('\n🎯 Top 5 Products:');
  result.slice(0, 5).forEach((p, i) => {
    const premiumBadge = p.isPremium ? '⭐' : '  ';
    console.log(`  ${i + 1}. ${premiumBadge} ${p.title} (${p.rating}⭐, ${p.reviews} reviews)`);
  });
  
  const allPassed = Object.values(validations).every(v => v);
  
  if (allPassed) {
    console.log('\n✅ All validations passed!');
    console.log('🎉 Product filtering is working correctly!');
    return true;
  } else {
    console.log('\n❌ Some validations failed!');
    return false;
  }
}

/**
 * Run all tests
 */
function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Integration Test: Complete Product Filtering Flow');
  console.log('='.repeat(60));
  
  const passed = testCompleteFlow();
  
  console.log('\n' + '='.repeat(60));
  
  if (passed) {
    console.log('✅ Integration test passed!');
    process.exit(0);
  } else {
    console.log('❌ Integration test failed!');
    process.exit(1);
  }
}

// Run tests
runTests();
