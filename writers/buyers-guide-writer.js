/**
 * Buyers Guide Writer Module
 * Generates 300-500 word comprehensive buying guides with H2/H3 headings
 */

const { calculateAveragePrice } = require('./utils');

/**
 * Budget ranges for different product categories
 */
const budgetRanges = {
  default: {
    budget: { min: 30, max: 50, description: 'budget-friendly' },
    midRange: { min: 50, max: 150, description: 'mid-range' },
    premium: { min: 150, max: 500, description: 'premium' }
  },
  headphones: {
    budget: { min: 20, max: 50, description: 'entry-level' },
    midRange: { min: 50, max: 200, description: 'mid-range' },
    premium: { min: 200, max: 500, description: 'audiophile-grade' }
  },
  laptops: {
    budget: { min: 300, max: 500, description: 'basic' },
    midRange: { min: 500, max: 1000, description: 'mid-range' },
    premium: { min: 1000, max: 3000, description: 'professional-grade' }
  },
  cameras: {
    budget: { min: 200, max: 500, description: 'beginner' },
    midRange: { min: 500, max: 1500, description: 'enthusiast' },
    premium: { min: 1500, max: 5000, description: 'professional' }
  }
};

/**
 * Get budget ranges based on niche
 * @param {string} niche - The niche category
 * @returns {object} Budget ranges object
 */
function getBudgetRanges(niche) {
  const nicheLower = niche.toLowerCase();

  if (nicheLower.includes('headphone') || nicheLower.includes('earbud') || nicheLower.includes('audio')) {
    return budgetRanges.headphones;
  }
  if (nicheLower.includes('laptop') || nicheLower.includes('computer') || nicheLower.includes('notebook')) {
    return budgetRanges.laptops;
  }
  if (nicheLower.includes('camera') || nicheLower.includes('photo')) {
    return budgetRanges.cameras;
  }

  return budgetRanges.default;
}

/**
 * Get buying factors based on niche category
 * @param {string} niche - The niche category
 * @returns {Array} Array of factor objects
 */
function getBuyingFactors(niche) {
  const nicheLower = niche.toLowerCase();

  // Default factors that apply to most products
  const defaultFactors = [
    { name: 'Quality and Durability', description: 'Look for well-built products with quality materials that will last through regular use' },
    { name: 'Price and Value', description: 'Consider the overall value proposition, not just the lowest price tag' },
    { name: 'Customer Reviews', description: 'Check ratings and reviews from verified purchasers to understand real-world performance' },
    { name: 'Brand Reputation', description: 'Choose reputable brands with established track records and good customer support' },
    { name: 'Warranty and Support', description: 'Ensure adequate warranty coverage and accessible customer service channels' }
  ];

  // Niche-specific factors
  if (nicheLower.includes('earbud') || nicheLower.includes('headphone')) {
    return [
      { name: 'Sound Quality and Audio Profile', description: 'Look for balanced sound with clear highs, detailed mids, and punchy bass. Consider if you prefer neutral sound or enhanced bass for specific genres like EDM or hip-hop.' },
      { name: 'Battery Life and Charging', description: 'Aim for 20+ hours on over-ear headphones and 6-8 hours on earbuds. Fast charging (10 minutes for 2-3 hours) is a valuable convenience feature for daily commuters.' },
      { name: 'Comfort and Fit for Long Sessions', description: 'Over-ear cups should be well-padded and not clamp too tight. For earbuds, multiple tip sizes ensure a secure seal. Consider weight for all-day wear.' },
      { name: 'Active Noise Cancellation (ANC)', description: 'Essential for travel and noisy environments. Look for adaptive ANC that adjusts to your surroundings, and transparency/ambient modes for situational awareness.' },
      { name: 'Bluetooth 5.3 and LE Audio', description: 'Latest Bluetooth 5.3 offers better range, stability, and power efficiency. LE Audio (available via updates on some models) provides superior quality at lower bitrates.' },
      { name: 'Multipoint Connection and App Support', description: 'Connect to multiple devices simultaneously (phone + laptop). Companion apps unlock EQ customization, firmware updates, and advanced features.' }
    ];
  }

  if (nicheLower.includes('camera')) {
    return [
      { name: 'Image Quality', description: 'Consider megapixel count, sensor size, and image processing capabilities' },
      { name: 'Lens Options', description: 'Evaluate interchangeable lens compatibility or versatile zoom range' },
      { name: 'Video Capabilities', description: '4K video recording, frame rate options, and stabilization features' },
      { name: 'Autofocus Performance', description: 'Fast and accurate autofocus system for capturing moving subjects' },
      { name: 'Build Quality', description: 'Weather sealing and durable construction for various shooting conditions' }
    ];
  }

  if (nicheLower.includes('laptop')) {
    return [
      { name: 'Performance', description: 'Processor speed, RAM, and overall system responsiveness for your tasks' },
      { name: 'Battery Life', description: 'All-day battery for portability and uninterrupted productivity' },
      { name: 'Display Quality', description: 'Screen resolution, brightness, and color accuracy for your use case' },
      { name: 'Portability', description: 'Weight and size considerations for easy transport and daily carry' },
      { name: 'Storage', description: 'SSD capacity for fast file access and sufficient storage for your needs' }
    ];
  }

  return defaultFactors;
}

/**
 * Generate a comprehensive buying guide
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects
 * @returns {string} HTML content for buyer's guide (300-500 words)
 */
function generateBuyersGuide(niche, products) {
  const nicheFactors = getBuyingFactors(niche);
  const ranges = getBudgetRanges(niche);
  const nicheLower = niche.toLowerCase();
  const year = new Date().getFullYear();

  // Calculate average price from products if available
  const avgPrice = calculateAveragePrice(products);

  const content = `
        <h2>Complete Buyer's Guide for ${niche}</h2>
        <p>Choosing the right ${nicheLower} requires careful consideration of several key factors. 
        This comprehensive guide will help you understand what to look for to ensure you make the best purchase decision for your specific needs and budget in ${year}.</p>
        
        <h3>Key Factors to Compare</h3>
        <p>When evaluating different ${nicheLower}, pay close attention to these critical aspects:</p>
        <ul>
            ${nicheFactors.map(factor => `<li><strong>${factor.name}:</strong> ${factor.description}</li>`).join('\n            ')}
        </ul>
        
        <h3>Budget Ranges and What to Expect</h3>
        <p>The ${nicheLower} market offers options at various price points. Here's what you can expect at each level:</p>
        <ul>
            <li><strong>Budget ($${ranges.budget.min}-$${ranges.budget.max}):</strong> ${ranges.budget.description} options that provide essential functionality for casual users. Good for those just starting out or with basic needs.</li>
            <li><strong>Mid-Range ($${ranges.midRange.min}-$${ranges.midRange.max}):</strong> ${ranges.midRange.description} products offering excellent value with a balance of quality and affordability. Best for most users.</li>
            <li><strong>Premium ($${ranges.premium.min}+):</strong> ${ranges.premium.description} selections with advanced features, superior build quality, and professional-level performance.</li>
        </ul>
        <p>Our curated list features products averaging around $${avgPrice}, representing solid value across different budget categories.</p>
        
        <h3>Brand Reputation Matters</h3>
        <p>Established brands often provide better customer support, warranty coverage, and product reliability. 
        However, newer brands can offer innovative features at competitive prices. Always check customer reviews 
        and ratings before making your final decision, and consider the brand's track record in the ${nicheLower} space.</p>
        
        <h3>Making Your Final Decision</h3>
        <p>Consider your specific needs, budget constraints, and intended use cases. Read customer reviews to understand real-world 
        performance beyond marketing claims. Check return policies and warranty terms to protect your purchase. Compare multiple options from our top 10 list to 
        find the perfect match for your requirements. Remember, the most expensive option isn't always the best choice for your particular situation.</p>
    `;

  return content.trim();
}

module.exports = {
  generateBuyersGuide,
  getBuyingFactors
};
