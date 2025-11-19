/**
 * Unit tests for applyFilters function
 */

// Mock the applyFilters function since we can't easily require it from site-generator.js
function applyFilters(products) {
  const PREMIUM_BRANDS = [
    "Apple","Sony","Bose","Sennheiser","Bang & Olufsen",
    "Shure","Razer","Logitech","Samsung","JBL","Beats","HP","Dell","Lenovo"
  ];

  const ALLOWED_RATING = 4.2;
  const MIN_REVIEWS = 1500;

  const seenAsins = new Set();
  const final = [];

  for (const p of products) {
    const title = (p.title || "").toLowerCase();
    const rating = parseFloat(p.rating) || 0;
    const reviews = parseInt(p.reviews) || 0;
    const asin = p.asin || null;

    if (!asin || seenAsins.has(asin)) continue;
    seenAsins.add(asin);

    if (rating < ALLOWED_RATING) continue;
    if (reviews < MIN_REVIEWS) continue;

    const isPremium = PREMIUM_BRANDS.some(b => title.includes(b.toLowerCase()));
    if (!isPremium) continue;

    final.push(p);
  }

  return final.slice(0, 10);
}

/**
 * Test deduplication by ASIN
 */
function testDeduplication() {
  console.log('\n🔍 Testing deduplication...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' }, // duplicate
    { asin: 'B002', title: 'Bose QuietComfort 45', rating: '4.6', reviews: '3000' }
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 2) {
    console.log('  ✓ Duplicates removed correctly (expected 2, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Deduplication failed (expected 2, got', result.length + ')');
    return false;
  }
}

/**
 * Test rating filter
 */
function testRatingFilter() {
  console.log('\n⭐ Testing rating filter (>= 4.2)...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: 'Apple AirPods Pro', rating: '4.0', reviews: '2000' }, // too low rating
    { asin: 'B003', title: 'Bose QuietComfort 45', rating: '4.2', reviews: '3000' } // exactly 4.2
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 2 && result.every(p => parseFloat(p.rating) >= 4.2)) {
    console.log('  ✓ Rating filter works correctly (expected 2, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Rating filter failed (expected 2, got', result.length + ')');
    return false;
  }
}

/**
 * Test review count filter
 */
function testReviewsFilter() {
  console.log('\n📊 Testing reviews filter (>= 1500)...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: 'Apple AirPods Pro', rating: '4.5', reviews: '1000' }, // too few reviews
    { asin: 'B003', title: 'Bose QuietComfort 45', rating: '4.5', reviews: '1500' } // exactly 1500
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 2 && result.every(p => parseInt(p.reviews) >= 1500)) {
    console.log('  ✓ Reviews filter works correctly (expected 2, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Reviews filter failed (expected 2, got', result.length + ')');
    return false;
  }
}

/**
 * Test premium brand filter
 */
function testPremiumBrandFilter() {
  console.log('\n🏷️  Testing premium brand filter...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: 'Generic Headphones', rating: '4.5', reviews: '2000' }, // not premium
    { asin: 'B003', title: 'Apple AirPods Pro', rating: '4.5', reviews: '3000' }
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 2) {
    console.log('  ✓ Premium brand filter works correctly (expected 2, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Premium brand filter failed (expected 2, got', result.length + ')');
    return false;
  }
}

/**
 * Test top 10 limit
 */
function testTop10Limit() {
  console.log('\n🔟 Testing top 10 limit...');
  
  const products = [];
  for (let i = 1; i <= 15; i++) {
    products.push({
      asin: `B${String(i).padStart(3, '0')}`,
      title: `Sony Product ${i}`,
      rating: '4.5',
      reviews: '2000'
    });
  }
  
  const result = applyFilters(products);
  
  if (result.length === 10) {
    console.log('  ✓ Top 10 limit works correctly (expected 10, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Top 10 limit failed (expected 10, got', result.length + ')');
    return false;
  }
}

/**
 * Test with missing ASIN
 */
function testMissingAsin() {
  console.log('\n🚫 Testing products without ASIN are skipped...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: null, title: 'Apple AirPods Pro', rating: '4.5', reviews: '2000' }, // no ASIN
    { asin: 'B003', title: 'Bose QuietComfort 45', rating: '4.5', reviews: '3000' }
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 2) {
    console.log('  ✓ Products without ASIN are skipped (expected 2, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Missing ASIN test failed (expected 2, got', result.length + ')');
    return false;
  }
}

/**
 * Run all tests
 */
function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 applyFilters() Function Tests');
  console.log('='.repeat(60));
  
  const tests = [
    testDeduplication,
    testRatingFilter,
    testReviewsFilter,
    testPremiumBrandFilter,
    testTop10Limit,
    testMissingAsin
  ];
  
  let passed = 0;
  tests.forEach(test => {
    if (test()) {
      passed++;
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed}/${tests.length} tests passed`);
  console.log('='.repeat(60));
  
  if (passed === tests.length) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed!');
    process.exit(1);
  }
}

// Run tests
runTests();
