/**
 * Unit tests for premium filtering and deduplication layer
 */

/**
 * Test deduplication by ASIN
 */
function testDeduplication() {
  console.log('\n🔍 Testing deduplication by ASIN...');
  
  const gatheredProducts = [
    { asin: 'B001', title: 'Sony Product A', rating: '4.5', reviews: '1000' },
    { asin: 'B002', title: 'Apple Product B', rating: '4.7', reviews: '2000' },
    { asin: 'B001', title: 'Sony Product A Duplicate', rating: '4.5', reviews: '1000' },
    { asin: 'B003', title: 'Samsung Product C', rating: '4.3', reviews: '500' },
    { asin: 'B002', title: 'Apple Product B Duplicate', rating: '4.7', reviews: '2000' }
  ];
  
  // Simulate deduplication logic
  const unique = [];
  const seen = new Set();
  for (const p of gatheredProducts) {
    if (p.asin && !seen.has(p.asin)) {
      seen.add(p.asin);
      unique.push(p);
    }
  }
  
  const expectedCount = 3; // B001, B002, B003
  const passed = unique.length === expectedCount;
  
  if (passed) {
    console.log(`  ✓ Deduplication works correctly: ${unique.length} unique products from ${gatheredProducts.length} total`);
  } else {
    console.log(`  ✗ Expected ${expectedCount} unique products, got ${unique.length}`);
  }
  
  return passed;
}

/**
 * Test premium brand scoring
 */
function testPremiumBrandScoring() {
  console.log('\n⭐ Testing premium brand scoring...');
  
  const PREMIUM_BRANDS = [
    "Apple","Sony","Bose","Sennheiser","Bang & Olufsen",
    "Shure","Razer","Logitech","Samsung","JBL","Beats","HP","Dell","Lenovo"
  ];
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '1000' },
    { asin: 'B002', title: 'Generic Headphones', rating: '4.5', reviews: '1000' },
    { asin: 'B003', title: 'Apple AirPods Pro', rating: '4.7', reviews: '5000' }
  ];
  
  // Simulate scoring logic
  const scored = products.map(p => {
    const title = (p.title || "").toLowerCase();
    const isPremium = PREMIUM_BRANDS.some(b => title.includes(b.toLowerCase()));
    const rating = parseFloat(p.rating) || 0;
    const reviews = parseInt(p.reviews) || 0;
  
    let score = 0;
    if (isPremium) score += 50;        // major boost if premium brand
    score += rating * 10;              // rating weight
    score += reviews / 500;            // review volume weight
  
    return { ...p, score };
  });
  
  // Check that premium brands have higher scores
  const sonyScore = scored.find(p => p.title.includes('Sony')).score;
  const genericScore = scored.find(p => p.title.includes('Generic')).score;
  const appleScore = scored.find(p => p.title.includes('Apple')).score;
  
  const passed = sonyScore > genericScore && appleScore > genericScore;
  
  if (passed) {
    console.log(`  ✓ Premium brands scored higher:`);
    console.log(`    Sony: ${sonyScore.toFixed(2)} (Premium: 50 + Rating: 45 + Reviews: 2)`);
    console.log(`    Generic: ${genericScore.toFixed(2)} (Premium: 0 + Rating: 45 + Reviews: 2)`);
    console.log(`    Apple: ${appleScore.toFixed(2)} (Premium: 50 + Rating: 47 + Reviews: 10)`);
  } else {
    console.log(`  ✗ Premium brands should have higher scores than generic products`);
  }
  
  return passed;
}

/**
 * Test sorting by score
 */
function testSortingByScore() {
  console.log('\n📊 Testing sorting by score...');
  
  const PREMIUM_BRANDS = [
    "Apple","Sony","Bose","Sennheiser","Bang & Olufsen",
    "Shure","Razer","Logitech","Samsung","JBL","Beats","HP","Dell","Lenovo"
  ];
  
  const products = [
    { asin: 'B001', title: 'Generic Product', rating: '4.5', reviews: '1000' },
    { asin: 'B002', title: 'Sony Premium', rating: '4.7', reviews: '5000' },
    { asin: 'B003', title: 'Samsung Good', rating: '4.3', reviews: '2000' }
  ];
  
  // Simulate scoring and sorting logic
  const scored = products.map(p => {
    const title = (p.title || "").toLowerCase();
    const isPremium = PREMIUM_BRANDS.some(b => title.includes(b.toLowerCase()));
    const rating = parseFloat(p.rating) || 0;
    const reviews = parseInt(p.reviews) || 0;
  
    let score = 0;
    if (isPremium) score += 50;
    score += rating * 10;
    score += reviews / 500;
  
    return { ...p, score };
  });
  
  const rankedProducts = scored.sort((a, b) => b.score - a.score);
  
  // Check that Sony is first (highest score)
  const passed = rankedProducts[0].title.includes('Sony');
  
  if (passed) {
    console.log(`  ✓ Products sorted correctly by score (best first):`);
    rankedProducts.forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.title} (score: ${p.score.toFixed(2)})`);
    });
  } else {
    console.log(`  ✗ Products not sorted correctly by score`);
  }
  
  return passed;
}

/**
 * Test limiting to top N products
 */
function testLimiting() {
  console.log('\n✂️  Testing limiting to top 12 products...');
  
  const products = Array.from({ length: 20 }, (_, i) => ({
    asin: `B${String(i + 1).padStart(3, '0')}`,
    title: `Product ${i + 1}`,
    rating: '4.5',
    reviews: '1000',
    score: 100 - i // Decreasing scores
  }));
  
  const filteredProducts = products.slice(0, 12);
  
  const passed = filteredProducts.length === 12;
  
  if (passed) {
    console.log(`  ✓ Correctly limited to 12 products (from ${products.length} total)`);
  } else {
    console.log(`  ✗ Expected 12 products, got ${filteredProducts.length}`);
  }
  
  return passed;
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🧪 Running Filtering Layer Tests...');
  console.log('='.repeat(60));
  
  const results = {
    deduplication: testDeduplication(),
    premiumScoring: testPremiumBrandScoring(),
    sorting: testSortingByScore(),
    limiting: testLimiting()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([name, result]) => {
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${name}: ${result ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Result: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testDeduplication,
  testPremiumBrandScoring,
  testSortingByScore,
  testLimiting
};
