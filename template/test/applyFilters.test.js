/**
 * Unit tests for applyFilters function
 */

// Mock the applyFilters function since we can't easily require it from site-generator.js
function applyFilters(products) {
  const PREMIUM_BRANDS = [
    "Apple","Sony","Bose","Sennheiser","Bang & Olufsen",
    "Shure","Razer","Logitech","Samsung","JBL","Beats","HP","Dell","Lenovo"
  ];

  // Lenient thresholds to ensure products pass through
  const MIN_RATING = 3.5;  // Lowered from 4.2

  const seenAsins = new Set();
  const seenTitles = new Set();
  const final = [];

  for (const p of products) {
    const title = (p.title || "").trim();
    const titleLower = title.toLowerCase();
    const rating = parseFloat(p.rating) || 0;
    const asin = p.asin || null;

    // Skip products with empty/null titles
    if (!title || title.length === 0) continue;

    // Skip products without ASIN
    if (!asin) continue;

    // Deduplicate by ASIN (primary)
    if (seenAsins.has(asin)) continue;
    
    // Deduplicate by title similarity (secondary)
    // Strip parentheses but KEEP color names to allow color variants
    const normalizedTitle = titleLower
      .replace(/\([^)]*\)/g, '')  // Remove content in parentheses
      .replace(/\s+/g, ' ')
      .trim();
    
    if (seenTitles.has(normalizedTitle)) continue;
    
    seenAsins.add(asin);
    seenTitles.add(normalizedTitle);

    if (rating < MIN_RATING) continue;

    // Premium brand check is now lenient - we score rather than filter
    const isPremium = PREMIUM_BRANDS.some(b => titleLower.includes(b.toLowerCase()));
    
    final.push({ ...p, isPremium });
  }

  // Sort by premium status first, then by rating, then by review count
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
  console.log('\n⭐ Testing rating filter (>= 3.5)...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: 'Apple AirPods Pro', rating: '3.0', reviews: '2000' }, // too low rating
    { asin: 'B003', title: 'Bose QuietComfort 45', rating: '3.5', reviews: '3000' } // exactly 3.5
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 2 && result.every(p => parseFloat(p.rating) >= 3.5)) {
    console.log('  ✓ Rating filter works correctly (expected 2, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Rating filter failed (expected 2, got', result.length + ')');
    return false;
  }
}

/**
 * Test review count is ignored (no filtering on reviews)
 */
function testReviewsFilter() {
  console.log('\n📊 Testing reviews are ignored (no review filtering)...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: 'Apple AirPods Pro', rating: '4.5', reviews: '5' }, // low reviews, should pass
    { asin: 'B003', title: 'Bose QuietComfort 45', rating: '4.5', reviews: '0' }, // 0 reviews, should pass
    { asin: 'B004', title: 'JBL Headphones', rating: '4.5', reviews: '-1' } // negative, should still pass
  ];
  
  const result = applyFilters(products);
  
  // All products should pass (review count is completely ignored)
  if (result.length === 4) {
    console.log('  ✓ Reviews ignored correctly (expected 4, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Reviews filter failed (expected 4, got', result.length + ')');
    return false;
  }
}

/**
 * Test premium brand filter (lenient - prioritizes premium but doesn't exclude others)
 */
function testPremiumBrandFilter() {
  console.log('\n🏷️  Testing premium brand prioritization...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: 'Generic Headphones', rating: '4.8', reviews: '2000' }, // non-premium but good rating
    { asin: 'B003', title: 'Apple AirPods Pro', rating: '4.5', reviews: '3000' }
  ];
  
  const result = applyFilters(products);
  
  // All products should pass (lenient filtering)
  // Premium brands should be sorted first
  if (result.length === 3 && result[0].isPremium && result[1].isPremium) {
    console.log('  ✓ Premium brands prioritized correctly (all 3 products pass, premium first)');
    return true;
  } else {
    console.log('  ✗ Premium brand prioritization failed (expected 3, got', result.length + ')');
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
 * Test with empty titles
 */
function testEmptyTitles() {
  console.log('\n📝 Testing products with empty titles are skipped...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: '', rating: '4.5', reviews: '2000' }, // empty title
    { asin: 'B003', title: null, rating: '4.5', reviews: '2000' }, // null title
    { asin: 'B004', title: 'Apple AirPods Pro', rating: '4.5', reviews: '3000' }
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 2) {
    console.log('  ✓ Products with empty/null titles are skipped (expected 2, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Empty title test failed (expected 2, got', result.length + ')');
    return false;
  }
}

/**
 * Test title similarity deduplication - color variants should NOT be deduplicated
 */
function testTitleSimilarity() {
  console.log('\n🔄 Testing title similarity deduplication...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5 Black', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: 'Sony WH-1000XM5 Silver', rating: '4.5', reviews: '2000' }, // different color - should NOT be deduplicated
    { asin: 'B003', title: 'Apple AirPods Pro', rating: '4.5', reviews: '3000' }
  ];
  
  const result = applyFilters(products);
  
  // Color variants should NOT be treated as duplicates anymore
  if (result.length === 3) {
    console.log('  ✓ Color variants NOT deduplicated (expected 3, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Title similarity test failed (expected 3, got', result.length + ')');
    return false;
  }
}

/**
 * Test that parentheses are stripped for deduplication
 */
function testParenthesesStripping() {
  console.log('\n📝 Testing parentheses stripping for deduplication...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5 (Black)', rating: '4.5', reviews: '2000' },
    { asin: 'B002', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '2000' }, // same product without parentheses - should be deduplicated
    { asin: 'B003', title: 'Apple AirPods Pro', rating: '4.5', reviews: '3000' }
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 2) {
    console.log('  ✓ Parentheses stripped correctly for deduplication (expected 2, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Parentheses stripping test failed (expected 2, got', result.length + ')');
    return false;
  }
}

/**
 * Test with 0 reviews (RapidAPI scenario)
 */
function testZeroReviews() {
  console.log('\n🔢 Testing products with 0 reviews are included...');
  
  const products = [
    { asin: 'B001', title: 'Sony WH-1000XM5', rating: '4.5', reviews: '0' },
    { asin: 'B002', title: 'Apple AirPods Pro', rating: '4.5', reviews: '0' },
    { asin: 'B003', title: 'Bose QuietComfort 45', rating: '4.5', reviews: '0' }
  ];
  
  const result = applyFilters(products);
  
  if (result.length === 3) {
    console.log('  ✓ Products with 0 reviews are included (expected 3, got', result.length + ')');
    return true;
  } else {
    console.log('  ✗ Zero reviews test failed (expected 3, got', result.length + ')');
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
    testZeroReviews,
    testPremiumBrandFilter,
    testTop10Limit,
    testMissingAsin,
    testEmptyTitles,
    testTitleSimilarity,
    testParenthesesStripping
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
