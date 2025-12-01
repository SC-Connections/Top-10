/**
 * Data Validation Script
 * Validates product data and logs skipped items
 */

const fs = require('fs');
const path = require('path');

// Required fields for a valid product
const REQUIRED_FIELDS = ['asin', 'title', 'price', 'reviews', 'rating', 'image', 'description', 'url'];

// Generic product names that should be rejected
const GENERIC_NAMES = [
  'Smart Watch', 'Smartwatch', 'Smart Watches',
  'Wireless Earbuds', 'Wireless Headphones', 'Bluetooth Headphones',
  'Bluetooth Earbuds', 'Earbuds', 'Headphones', 'Earphones',
  'Fitness Tracker', 'Activity Tracker', 'Sport Watch',
  'Gaming Headset', 'Headset', 'TWS',
  'Tablet', 'Laptop', 'Computer', 'PC',
  'TV', 'Television', 'Monitor', 'Display',
  'Camera', 'Webcam', 'Speaker', 'Soundbar',
  'Robot Vacuum', 'Vacuum Cleaner', 'Smart Home',
  'Watch for Men', 'Watch for Women', 'Watches for Men', 'Watches for Women'
];

// Color variants to remove for deduplication
const COLOR_WORDS = [
  'black', 'white', 'silver', 'gold', 'rose gold', 'space gray', 'space grey',
  'midnight', 'starlight', 'blue', 'red', 'green', 'pink', 'purple', 'orange',
  'navy', 'gray', 'grey', 'bronze', 'copper', 'champagne', 'graphite',
  'slate blue', 'cloud pink', 'sand gray', 'twilight blue', 'jet black',
  'sky blue', 'cream', 'beige', 'brown', 'yellow', 'teal', 'coral'
];

// Premium brands list
const PREMIUM_BRANDS = [
  'Apple', 'Sony', 'Bose', 'Sennheiser', 'Bang & Olufsen', 'B&O',
  'Shure', 'Razer', 'Logitech', 'Samsung', 'JBL', 'Beats', 'HP', 'Dell', 'Lenovo',
  'Garmin', 'Fitbit', 'Fossil', 'Skullcandy', 'Audio-Technica', 'Anker', 'Microsoft',
  'LG', 'Asus', 'Acer', 'MSI', 'Alienware', 'Corsair', 'SteelSeries', 'HyperX',
  'Jabra', 'Plantronics', 'Philips', 'Panasonic', 'TCL', 'Hisense', 'Vizio',
  'Nintendo', 'PlayStation', 'Xbox', 'Oculus', 'Meta', 'Google', 'Amazon', 'Kindle',
  'Bowers & Wilkins', 'Master & Dynamic', 'Focal', 'AKG', 'Beyerdynamic',
  'Marshall', 'Denon', 'Harman Kardon', 'KEF', 'Klipsch',
  'Soundcore', '1MORE', 'Jaybird', 'Mpow', 'Tozo', 'Tribit', 'EarFun',
  'Xiaomi', 'OnePlus', 'Huawei', 'Oppo', 'Realme', 'Nothing', 'Motorola',
  'Amazfit', 'Withings', 'Polar', 'Suunto', 'Coros', 'Mobvoi', 'TicWatch',
  'ROG', 'Republic of Gamers', 'Turtle Beach', 'Astro', 'EPOS',
  'Dyson', 'Roomba', 'iRobot', 'Ecovacs', 'Roborock', 'Shark', 'Eufy',
  'Canon', 'Nikon', 'Fujifilm', 'GoPro', 'DJI', 'Insta360', 'Olympus'
];

/**
 * Validation result object
 */
class ValidationResult {
  constructor() {
    this.valid = [];
    this.skipped = [];
    this.stats = {
      total: 0,
      valid: 0,
      skipped: 0,
      missingFields: 0,
      generic: 0,
      duplicates: 0,
      noBrand: 0,
      lowRating: 0
    };
  }
}

/**
 * Normalize model name for deduplication
 * Removes color variants, size indicators, edition markers
 * @param {string} title - Product title
 * @returns {string} Normalized model name
 */
function normalizeModelName(title) {
  let normalized = title.toLowerCase();
  
  // Remove content in parentheses
  normalized = normalized.replace(/\([^)]*\)/g, '');
  
  // Remove content after " - " or " – " (often contains color/variant info)
  normalized = normalized.replace(/\s[-–]\s.*$/, '');
  
  // Remove color words
  const colorPattern = new RegExp(`\\b(${COLOR_WORDS.join('|')})\\b`, 'gi');
  normalized = normalized.replace(colorPattern, '');
  
  // Remove edition markers
  const editionWords = ['limited edition', 'special edition', 'amazon exclusive'];
  const editionPattern = new RegExp(`(${editionWords.join('|')})`, 'gi');
  normalized = normalized.replace(editionPattern, '');
  
  // Clean up extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Check if product title starts with generic name
 * @param {string} title - Product title
 * @returns {boolean} True if generic
 */
function isGenericProduct(title) {
  const titleLower = title.toLowerCase().trim();
  
  // Check if starts with generic product name
  for (const generic of GENERIC_NAMES) {
    if (titleLower.startsWith(generic.toLowerCase())) {
      return true;
    }
  }
  
  // Check for generic patterns
  const genericPatterns = [
    /^[0-9]+ Pack/i,
    /^[0-9]+ Pcs/i,
    /^[0-9]+ Piece/i,
    /^[0-9]+ Set/i,
    /^Generic /i,
    /^Universal /i,
    /^Compatible /i,
    /^Replacement /i,
    /^[0-9]{3,}/,
    /^New /i,
    /^Latest /i,
    /^Upgraded /i,
    /^2024 /i,
    /^2025 /i
  ];
  
  for (const pattern of genericPatterns) {
    if (pattern.test(title)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if product has a premium brand name
 * @param {string} title - Product title
 * @returns {boolean} True if has premium brand
 */
function hasPremiumBrand(title) {
  const titleLower = title.toLowerCase();
  
  for (const brand of PREMIUM_BRANDS) {
    if (titleLower.includes(brand.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate a single product
 * @param {object} product - Product object
 * @returns {object} Validation result { valid: boolean, reason: string }
 */
function validateProduct(product) {
  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!product[field] || product[field] === '') {
      return { valid: false, reason: `Missing required field: ${field}` };
    }
  }
  
  // Validate ASIN format
  if (!/^[A-Z0-9]{10}$/.test(product.asin)) {
    return { valid: false, reason: `Invalid ASIN format: ${product.asin}` };
  }
  
  // Check for generic product name
  if (isGenericProduct(product.title)) {
    return { valid: false, reason: 'Generic product name (no brand)' };
  }
  
  // Check for premium brand
  if (!hasPremiumBrand(product.title)) {
    return { valid: false, reason: 'No premium brand detected' };
  }
  
  // Validate rating
  const rating = parseFloat(product.rating);
  if (isNaN(rating) || rating < 3.5) {
    return { valid: false, reason: `Rating too low: ${product.rating}` };
  }
  
  // Validate image URL
  if (!product.image.startsWith('http')) {
    return { valid: false, reason: 'Invalid image URL' };
  }
  
  // Validate affiliate URL has tracking tag
  if (!product.url.includes('tag=')) {
    return { valid: false, reason: 'Missing affiliate tracking tag in URL' };
  }
  
  return { valid: true, reason: null };
}

/**
 * Validate an array of products
 * @param {Array} products - Array of product objects
 * @param {object} options - Validation options
 * @returns {ValidationResult} Validation results
 */
function validateProducts(products, options = {}) {
  const result = new ValidationResult();
  const seenAsins = new Set();
  const seenModels = new Set();
  
  result.stats.total = products.length;
  
  for (const product of products) {
    const validation = validateProduct(product);
    
    if (!validation.valid) {
      // Categorize the skip reason
      if (validation.reason.includes('Missing required field')) {
        result.stats.missingFields++;
      } else if (validation.reason.includes('Generic product')) {
        result.stats.generic++;
      } else if (validation.reason.includes('No premium brand')) {
        result.stats.noBrand++;
      } else if (validation.reason.includes('Rating too low')) {
        result.stats.lowRating++;
      }
      
      result.skipped.push({
        product: { asin: product.asin, title: product.title },
        reason: validation.reason
      });
      result.stats.skipped++;
      continue;
    }
    
    // Check for duplicate ASIN
    if (seenAsins.has(product.asin)) {
      result.skipped.push({
        product: { asin: product.asin, title: product.title },
        reason: 'Duplicate ASIN'
      });
      result.stats.duplicates++;
      result.stats.skipped++;
      continue;
    }
    
    // Check for duplicate model (color variant)
    const normalizedModel = normalizeModelName(product.title);
    if (seenModels.has(normalizedModel)) {
      result.skipped.push({
        product: { asin: product.asin, title: product.title },
        reason: `Color variant of existing model: ${normalizedModel}`
      });
      result.stats.duplicates++;
      result.stats.skipped++;
      continue;
    }
    
    // Product is valid
    seenAsins.add(product.asin);
    seenModels.add(normalizedModel);
    result.valid.push(product);
    result.stats.valid++;
  }
  
  return result;
}

/**
 * Write validation log to file
 * @param {string} niche - Niche name
 * @param {ValidationResult} result - Validation result
 * @param {string} logDir - Log directory path
 */
function writeValidationLog(niche, result, logDir) {
  const timestamp = new Date().toISOString();
  const logPath = path.join(logDir, `validation-${niche.replace(/\s+/g, '-').toLowerCase()}.log`);
  
  let logContent = `=== Validation Log for ${niche} ===\n`;
  logContent += `Timestamp: ${timestamp}\n\n`;
  
  logContent += `=== Statistics ===\n`;
  logContent += `Total products: ${result.stats.total}\n`;
  logContent += `Valid products: ${result.stats.valid}\n`;
  logContent += `Skipped products: ${result.stats.skipped}\n`;
  logContent += `  - Missing fields: ${result.stats.missingFields}\n`;
  logContent += `  - Generic products: ${result.stats.generic}\n`;
  logContent += `  - No premium brand: ${result.stats.noBrand}\n`;
  logContent += `  - Low rating: ${result.stats.lowRating}\n`;
  logContent += `  - Duplicates: ${result.stats.duplicates}\n\n`;
  
  if (result.skipped.length > 0) {
    logContent += `=== Skipped Products ===\n`;
    result.skipped.forEach((item, index) => {
      logContent += `${index + 1}. ASIN: ${item.product.asin || 'N/A'}\n`;
      logContent += `   Title: ${item.product.title || 'N/A'}\n`;
      logContent += `   Reason: ${item.reason}\n\n`;
    });
  }
  
  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.writeFileSync(logPath, logContent);
  console.log(`📝 Validation log written to: ${logPath}`);
  
  return logPath;
}

/**
 * Main validation function for CLI usage
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node validate-data.js <data-file.json> [--log-dir <dir>]');
    console.log('');
    console.log('Example:');
    console.log('  node validate-data.js data/bluetooth-headphones.json');
    console.log('  node validate-data.js data/bluetooth-headphones.json --log-dir ./logs');
    process.exit(1);
  }
  
  const dataFile = args[0];
  let logDir = path.join(__dirname, '..', 'logs');
  
  // Parse --log-dir option
  const logDirIndex = args.indexOf('--log-dir');
  if (logDirIndex !== -1 && args[logDirIndex + 1]) {
    logDir = args[logDirIndex + 1];
  }
  
  // Read data file
  if (!fs.existsSync(dataFile)) {
    console.error(`❌ File not found: ${dataFile}`);
    process.exit(1);
  }
  
  const products = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  const niche = path.basename(dataFile, '.json');
  
  console.log(`\n🔍 Validating ${products.length} products for "${niche}"...\n`);
  
  const result = validateProducts(products);
  
  // Print summary
  console.log('=== Validation Summary ===');
  console.log(`Total: ${result.stats.total}`);
  console.log(`✅ Valid: ${result.stats.valid}`);
  console.log(`❌ Skipped: ${result.stats.skipped}`);
  console.log(`  - Missing fields: ${result.stats.missingFields}`);
  console.log(`  - Generic products: ${result.stats.generic}`);
  console.log(`  - No premium brand: ${result.stats.noBrand}`);
  console.log(`  - Low rating: ${result.stats.lowRating}`);
  console.log(`  - Duplicates: ${result.stats.duplicates}`);
  
  // Write log file
  writeValidationLog(niche, result, logDir);
  
  // Exit with error if no valid products
  if (result.stats.valid === 0) {
    console.error('\n❌ ERROR: No valid products found!');
    process.exit(1);
  }
  
  console.log(`\n✅ Validation complete: ${result.stats.valid} valid products`);
}

// Export for use as module
module.exports = {
  validateProduct,
  validateProducts,
  normalizeModelName,
  isGenericProduct,
  hasPremiumBrand,
  writeValidationLog,
  ValidationResult,
  REQUIRED_FIELDS,
  GENERIC_NAMES,
  PREMIUM_BRANDS,
  COLOR_WORDS
};

// Run if called directly
if (require.main === module) {
  main();
}
