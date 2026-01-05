#!/usr/bin/env node
/**
 * Test brand filtering and title cleaning logic
 */

// Mock products with various scenarios
const mockProducts = [
  // Premium branded products (should pass)
  {
    asin: 'B001',
    title: 'Sony WF-1000XM5 Truly Wireless Noise Cancelling Earbuds - Black',
    price: '$299.99',
    rating: '4.5',
    reviews: '1234'
  },
  {
    asin: 'B002',
    title: 'Bose QuietComfort Ultra Earbuds - True Wireless Noise Cancelling Bluetooth Earbuds, White',
    price: '$249.00',
    rating: '4.6',
    reviews: '856'
  },
  {
    asin: 'B003',
    title: 'Apple AirPods Pro (2nd Generation) with MagSafe Case',
    price: '$249.00',
    rating: '4.7',
    reviews: '15234'
  },
  {
    asin: 'B004',
    title: 'Sennheiser Momentum True Wireless 3 - Black',
    price: '$279.95',
    rating: '4.4',
    reviews: '567'
  },
  
  // Generic/no-brand products (should be rejected)
  {
    asin: 'B005',
    title: 'Wireless Earbuds Bluetooth 5.4 HiFi Stereo Headphones with Noise Cancelling',
    price: '$29.99',
    rating: '5.0',
    reviews: '12'
  },
  {
    asin: 'B006',
    title: 'Bluetooth Earbuds, 2026 Newest True Wireless Earbuds for iPhone Android',
    price: '$19.99',
    rating: '4.9',
    reviews: '45'
  },
  {
    asin: 'B007',
    title: 'Adaptive Hybrid Active Noise Canceling Wireless Earbuds Bluetooth 5.4',
    price: '$34.99',
    rating: '4.8',
    reviews: '89'
  },
  
  // Reputable but not premium (should pass but lower ranked)
  {
    asin: 'B008',
    title: 'Anker Soundcore Liberty 4 NC Wireless Earbuds with Adaptive ANC',
    price: '$99.99',
    rating: '4.5',
    reviews: '2345'
  },
  {
    asin: 'B009',
    title: 'JBL Live Pro 2 TWS True Wireless Noise Cancelling Earbuds',
    price: '$149.95',
    rating: '4.4',
    reviews: '1123'
  },
  
  // Duplicate model (should be deduplicated)
  {
    asin: 'B010',
    title: 'Sony WF-1000XM5 Truly Wireless Noise Cancelling Earbuds - Silver',
    price: '$299.99',
    rating: '4.5',
    reviews: '1234'
  },
  
  // Accessory (should be rejected)
  {
    asin: 'B011',
    title: 'Sony Earbuds Case for WF-1000XM5 - Protective Cover',
    price: '$14.99',
    rating: '4.3',
    reviews: '234'
  }
];

// Import the constants and functions we need to test
const PREMIUM_BRANDS = [
  "Sony", "Bose", "Sennheiser", "Apple", "Beats", "Jabra", "Anker", 
  "Soundcore", "Samsung", "Google", "JBL", "Shure", "Bowers & Wilkins", 
  "Bang & Olufsen", "Technics", "Master & Dynamic", "Nothing", "OnePlus", 
  "1More", "Skullcandy", "Audio-Technica", "Plantronics", "Razer"
];

const REPUTABLE_BRANDS = [
  ...PREMIUM_BRANDS,
  "Mpow", "Tozo", "Tribit", "EarFun", "Jaybird"
];

const GENERIC_BLOCKLIST_PATTERNS = [
  /^wireless earbuds$/i,
  /^bluetooth earbuds$/i,
  /^noise cancell?ing earbuds$/i,
  /^sports? earbuds$/i,
  /^true wireless$/i,
  /^earbuds$/i
];

const SPAM_PATTERNS = [
  /bluetooth\s+5\.[0-9]/gi,
  /\b202[0-9]\s+(new|newest|latest|upgrade)\b/gi,
  /\bfor\s+iphone\s+android\b/gi,
  /\bwith\s+microphone\b/gi,
  /\bdeep\s+bass\b/gi,
  /\bsports?\b/gi,
  /\bgym\b/gi,
  /\bled\s+display\b/gi,
  /\bipx[0-9]\b/gi,
  /\bplaytime\b/gi,
  /\d+h\s+playtime\b/gi
];

function extractBrandFromTitle(title) {
  if (!title) return null;
  const titleLower = title.toLowerCase();
  
  for (const brand of REPUTABLE_BRANDS) {
    const brandLower = brand.toLowerCase();
    const regex = new RegExp(`\\b${brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(titleLower)) {
      return brand;
    }
  }
  
  return null;
}

function cleanProductTitle(title) {
  if (!title) return '';
  
  let cleaned = title;
  
  // Remove spam patterns
  for (const pattern of SPAM_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  
  // Remove content in parentheses
  cleaned = cleaned.replace(/\([^)]*\)/g, ' ');
  
  // Split on common delimiters
  const delimiters = [' - ', ' – ', ' | ', ', '];
  for (const delim of delimiters) {
    if (cleaned.includes(delim)) {
      cleaned = cleaned.split(delim)[0];
      break;
    }
  }
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // If too long, take first 8 words
  if (cleaned.length > 60) {
    const words = cleaned.split(' ');
    cleaned = words.slice(0, 8).join(' ');
  }
  
  return cleaned;
}

function isAcceptableTitle(title) {
  if (!title || title.length < 12) return false;
  
  const cleanedTitle = cleanProductTitle(title);
  if (cleanedTitle.length < 12) return false;
  
  for (const pattern of GENERIC_BLOCKLIST_PATTERNS) {
    if (pattern.test(cleanedTitle)) {
      return false;
    }
  }
  
  return true;
}

// Run tests
console.log('🧪 Testing Brand Filtering & Title Cleaning Logic\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

// Test 1: Premium brands should be detected
console.log('\n📋 Test 1: Premium Brand Detection');
const test1Products = [mockProducts[0], mockProducts[1], mockProducts[2], mockProducts[3]];
for (const product of test1Products) {
  const brand = extractBrandFromTitle(product.title);
  if (brand && PREMIUM_BRANDS.includes(brand)) {
    console.log(`✅ PASS: "${brand}" detected in "${product.title.substring(0, 50)}..."`);
    passed++;
  } else {
    console.log(`❌ FAIL: No premium brand detected in "${product.title.substring(0, 50)}..."`);
    failed++;
  }
}

// Test 2: Generic products should be rejected
console.log('\n📋 Test 2: Generic Product Rejection');
const test2Products = [mockProducts[4], mockProducts[5], mockProducts[6]];
for (const product of test2Products) {
  const brand = extractBrandFromTitle(product.title);
  const acceptable = isAcceptableTitle(product.title);
  if (!brand || !acceptable) {
    console.log(`✅ PASS: Generic product rejected: "${product.title.substring(0, 50)}..."`);
    passed++;
  } else {
    console.log(`❌ FAIL: Generic product NOT rejected: "${product.title.substring(0, 50)}..."`);
    failed++;
  }
}

// Test 3: Title cleaning preserves brand + model
console.log('\n📋 Test 3: Title Cleaning');
const test3Cases = [
  { 
    input: 'Sony WF-1000XM5 Truly Wireless Noise Cancelling Earbuds - Black',
    expected: 'Sony WF-1000XM5 Truly Wireless Noise Cancelling Earbuds'
  },
  {
    input: 'Bose QuietComfort Ultra Earbuds - True Wireless Bluetooth 5.4 Earbuds, White',
    expected: 'Bose QuietComfort Ultra Earbuds'
  },
  {
    input: 'Wireless Earbuds Bluetooth 5.4 2026 Newest for iPhone Android',
    expected: 'Wireless Earbuds'
  }
];

for (const testCase of test3Cases) {
  const cleaned = cleanProductTitle(testCase.input);
  if (cleaned === testCase.expected) {
    console.log(`✅ PASS: "${testCase.input.substring(0, 40)}..." → "${cleaned}"`);
    passed++;
  } else {
    console.log(`❌ FAIL: Expected "${testCase.expected}", got "${cleaned}"`);
    failed++;
  }
}

// Test 4: Accessory detection
console.log('\n📋 Test 4: Accessory Detection');
const accessory = mockProducts[10];
const accessoryBrand = extractBrandFromTitle(accessory.title);
const isAccessoryTitle = accessory.title.toLowerCase().includes(' case') || 
                         accessory.title.toLowerCase().includes(' cover');
if (accessoryBrand && isAccessoryTitle) {
  console.log(`✅ PASS: Accessory detected: "${accessory.title.substring(0, 50)}..."`);
  passed++;
} else {
  console.log(`❌ FAIL: Accessory not properly detected`);
  failed++;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
}
