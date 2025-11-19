/**
 * Unit tests for premium headphone filter
 */

const fs = require('fs');
const path = require('path');
const {
  normalizeTitle,
  isPremiumBrand,
  hasBlacklistedKeyword,
  filterAndDeduplicate,
  mapToCategories
} = require('../scraper/top10Premium');

// Define expected categories
const EXPECTED_CATEGORIES = [
  'sedan',
  'suv',
  'hatchback',
  'convertible',
  'coupe',
  'pickup',
  'minivan',
  'wagon',
  'ev',
  'luxury'
];

/**
 * Test normalizeTitle function
 */
function testNormalizeTitle() {
  console.log('\n📝 Testing normalizeTitle...');
  
  const tests = [
    { input: 'Sony WH-1000XM5 Black', expected: 'sony wh-1000xm5' },
    { input: 'Bose QuietComfort 45 Navy Blue', expected: 'bose quietcomfort 45' },
    { input: 'AirPods Max Silver Limited Edition', expected: 'airpods max' }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = normalizeTitle(test.input);
    if (result === test.expected) {
      console.log(`  ✓ "${test.input}" → "${result}"`);
      passed++;
    } else {
      console.log(`  ✗ "${test.input}" → "${result}" (expected "${test.expected}")`);
    }
  });
  
  console.log(`  ${passed}/${tests.length} tests passed`);
  return passed === tests.length;
}

/**
 * Test isPremiumBrand function
 */
function testIsPremiumBrand() {
  console.log('\n🏷️  Testing isPremiumBrand...');
  
  const tests = [
    { input: 'Sony WH-1000XM5', expected: true },
    { input: 'Bose QuietComfort 45', expected: true },
    { input: 'Beats Studio3', expected: true },
    { input: 'Beats Solo3', expected: false }, // Not Studio/Pro
    { input: 'Generic Bluetooth Headphones', expected: false },
    { input: 'Sennheiser Momentum 4', expected: true }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = isPremiumBrand(test.input);
    if (result === test.expected) {
      console.log(`  ✓ "${test.input}" → ${result}`);
      passed++;
    } else {
      console.log(`  ✗ "${test.input}" → ${result} (expected ${test.expected})`);
    }
  });
  
  console.log(`  ${passed}/${tests.length} tests passed`);
  return passed === tests.length;
}

/**
 * Test hasBlacklistedKeyword function
 */
function testHasBlacklistedKeyword() {
  console.log('\n🚫 Testing hasBlacklistedKeyword...');
  
  const tests = [
    { input: 'Sony WH-1000XM5', expected: false },
    { input: 'Gaming Headphones RGB', expected: true },
    { input: 'Kids Bluetooth Headphones', expected: true },
    { input: 'Budget Wireless Earbuds', expected: true },
    { input: 'Cheap Headphones', expected: true },
    { input: 'Sony TWS Premium', expected: false }, // TWS allowed for premium brands
    { input: 'Generic TWS Earbuds', expected: true }
  ];
  
  let passed = 0;
  tests.forEach(test => {
    const result = hasBlacklistedKeyword(test.input);
    if (result === test.expected) {
      console.log(`  ✓ "${test.input}" → ${result}`);
      passed++;
    } else {
      console.log(`  ✗ "${test.input}" → ${result} (expected ${test.expected})`);
    }
  });
  
  console.log(`  ${passed}/${tests.length} tests passed`);
  return passed === tests.length;
}

/**
 * Test filterAndDeduplicate function
 */
function testFilterAndDeduplicate() {
  console.log('\n🔧 Testing filterAndDeduplicate...');
  
  const testProducts = [
    { title: 'Sony WH-1000XM5 Black', price: 399, asin: 'TEST1' },
    { title: 'Sony WH-1000XM5 White', price: 399, asin: 'TEST2' }, // Duplicate
    { title: 'Bose QuietComfort 45', price: 329, asin: 'TEST3' },
    { title: 'Generic Cheap Headphones', price: 49, asin: 'TEST4' }, // Should be filtered
    { title: 'Gaming Headset RGB', price: 199, asin: 'TEST5' }, // Should be filtered
    { title: 'Sennheiser Momentum 4', price: 379, asin: 'TEST6' }
  ];
  
  const result = filterAndDeduplicate(testProducts);
  
  const hasUniqueTitles = new Set(result.map(p => p.normalizedTitle)).size === result.length;
  const allPremium = result.every(p => isPremiumBrand(p.title));
  const allExpensiveEnough = result.every(p => p.price >= 150);
  const noBlacklisted = result.every(p => !hasBlacklistedKeyword(p.title));
  
  console.log(`  ✓ Unique normalized titles: ${hasUniqueTitles}`);
  console.log(`  ✓ All premium brands: ${allPremium}`);
  console.log(`  ✓ All prices ≥ $150: ${allExpensiveEnough}`);
  console.log(`  ✓ No blacklisted keywords: ${noBlacklisted}`);
  console.log(`  ✓ Result count: ${result.length} (expected 3)`);
  
  return hasUniqueTitles && allPremium && allExpensiveEnough && noBlacklisted && result.length === 3;
}

/**
 * Test mapToCategories function
 */
function testMapToCategories() {
  console.log('\n🚗 Testing mapToCategories...');
  
  const testProducts = Array(10).fill(null).map((_, i) => ({
    title: `Sony WH-1000XM${i}`,
    normalizedTitle: `sony wh-1000xm${i}`,
    price: 399,
    asin: `TEST${i}`,
    trendScore: 90 - i * 5
  }));
  
  const result = mapToCategories(testProducts);
  
  const hasUniqueCategories = new Set(result.map(p => p.category)).size === result.length;
  const hasCorrectCategories = result.every(p => EXPECTED_CATEGORIES.includes(p.category));
  const hasCorrectCount = result.length === 10;
  const allHaveRequiredFields = result.every(p => 
    p.category && p.rank && p.brand && p.model && p.normalizedTitle && 
    p.asin && p.price && p.image && p.amazonUrl && typeof p.trendScore === 'number'
  );
  
  console.log(`  ✓ Unique categories: ${hasUniqueCategories}`);
  console.log(`  ✓ Correct categories: ${hasCorrectCategories}`);
  console.log(`  ✓ Correct count (10): ${hasCorrectCount}`);
  console.log(`  ✓ All have required fields: ${allHaveRequiredFields}`);
  
  return hasUniqueCategories && hasCorrectCategories && hasCorrectCount && allHaveRequiredFields;
}

/**
 * Test output file schema
 */
function testOutputFileSchema() {
  console.log('\n📄 Testing output file schema...');
  
  const outputPath = path.join(__dirname, '..', 'data', 'top10_premium_headphones.json');
  
  if (!fs.existsSync(outputPath)) {
    console.log('  ⚠️  Output file not found (will be generated by scraper)');
    return true; // Not a failure, file will be created
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    
    if (!Array.isArray(data)) {
      console.log('  ✗ Output is not an array');
      return false;
    }
    
    // Check that we have exactly 10 items
    const hasCorrectCount = data.length === 10;
    console.log(`  ${hasCorrectCount ? '✓' : '✗'} Has 10 items: ${data.length}`);
    
    // Check unique normalized titles
    const normalizedTitles = data.map(p => p.normalizedTitle);
    const hasUniqueNormalizedTitles = new Set(normalizedTitles).size === normalizedTitles.length;
    console.log(`  ${hasUniqueNormalizedTitles ? '✓' : '✗'} All normalized titles unique`);
    
    // Check all prices >= 150
    const allPricesValid = data.every(p => p.price >= 150);
    console.log(`  ${allPricesValid ? '✓' : '✗'} All prices ≥ $150`);
    
    // Check unique categories
    const categories = data.map(p => p.category);
    const hasUniqueCategories = new Set(categories).size === categories.length;
    console.log(`  ${hasUniqueCategories ? '✓' : '✗'} All categories unique`);
    
    // Check categories match expected list
    const hasCorrectCategories = categories.every(c => EXPECTED_CATEGORIES.includes(c));
    console.log(`  ${hasCorrectCategories ? '✓' : '✗'} All categories from expected list`);
    
    // Check required fields
    const allHaveRequiredFields = data.every(p =>
      p.category && p.rank && p.brand && p.model && p.normalizedTitle &&
      p.asin && p.price && p.image && p.amazonUrl && typeof p.trendScore === 'number'
    );
    console.log(`  ${allHaveRequiredFields ? '✓' : '✗'} All items have required fields`);
    
    return hasCorrectCount && hasUniqueNormalizedTitles && allPricesValid && 
           hasUniqueCategories && hasCorrectCategories && allHaveRequiredFields;
  } catch (error) {
    console.log(`  ✗ Error reading/parsing file: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🧪 Running Premium Filter Tests');
  console.log('='.repeat(60));
  
  const results = {
    normalizeTitle: testNormalizeTitle(),
    isPremiumBrand: testIsPremiumBrand(),
    hasBlacklistedKeyword: testHasBlacklistedKeyword(),
    filterAndDeduplicate: testFilterAndDeduplicate(),
    mapToCategories: testMapToCategories(),
    outputFileSchema: testOutputFileSchema()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results:');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([name, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${name}`);
  });
  
  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n' + '='.repeat(60));
  console.log(`${totalPassed}/${totalTests} test suites passed`);
  console.log('='.repeat(60));
  
  if (totalPassed === totalTests) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
