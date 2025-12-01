/**
 * Blog Writer Module
 * Generates 300-600 word HTML blog articles for individual products
 */

/**
 * Extract short product name from full Amazon title
 * @param {string} fullTitle - Full Amazon product title
 * @returns {string} Short product name
 */
function extractShortName(fullTitle) {
  const splitPatterns = [' - ', ' – ', ' | ', ' with ', ' featuring ', ', ', ' (', ' for '];

  let shortName = fullTitle;
  let splitIndex = -1;

  for (const pattern of splitPatterns) {
    const index = fullTitle.indexOf(pattern);
    if (index !== -1 && (splitIndex === -1 || index < splitIndex)) {
      splitIndex = index;
    }
  }

  if (splitIndex !== -1) {
    shortName = fullTitle.substring(0, splitIndex);
  }

  shortName = shortName.trim();

  if (shortName.length > 50) {
    const words = shortName.split(' ');
    shortName = words.slice(0, Math.min(4, words.length)).join(' ');
  }

  return shortName;
}

/**
 * Generate blog article title
 * @param {object} product - Product object
 * @param {number} rank - Product ranking
 * @returns {string} Blog title
 */
function generateBlogTitle(product, rank) {
  const productName = extractShortName(product.title || 'Product');
  const year = new Date().getFullYear();
  const titles = [
    `${productName} Review: Is It Worth Your Money in ${year}?`,
    `${productName}: Complete Review and Analysis`,
    `In-Depth Review: ${productName}`,
    `${productName} - Everything You Need to Know`,
    `Why ${productName} Ranks #${rank} in Our Top 10 List`
  ];

  return titles[rank % titles.length];
}

/**
 * Generate meta description for blog
 * @param {object} product - Product object
 * @param {string} niche - The niche category
 * @returns {string} Meta description
 */
function generateMetaDescription(product, niche) {
  const productName = extractShortName(product.title || 'this product');
  const rating = product.rating || '4.5';
  const year = new Date().getFullYear();

  return `Detailed review of ${productName}. Rated ${rating}/5 stars. See features, specifications, and why it's one of the best ${niche.toLowerCase()} in ${year}.`;
}

/**
 * Generate specs table HTML
 * @param {object} product - Product object
 * @returns {string} HTML specs table
 */
function generateSpecsTable(product) {
  const specs = [];

  if (product.price) {
    specs.push({ label: 'Price', value: product.price });
  }
  if (product.rating) {
    specs.push({ label: 'Rating', value: `${product.rating}/5 stars` });
  }
  if (product.reviews) {
    specs.push({ label: 'Reviews', value: `${product.reviews} customer reviews` });
  }
  if (product.asin) {
    specs.push({ label: 'ASIN', value: product.asin });
  }

  if (specs.length === 0) {
    return '';
  }

  return `
        <h3>Specifications</h3>
        <table class="specs-table">
            <tbody>
                ${specs.map(s => `<tr><td><strong>${s.label}</strong></td><td>${s.value}</td></tr>`).join('\n                ')}
            </tbody>
        </table>
    `;
}

/**
 * Generate pros and cons section
 * @param {object} product - Product object
 * @returns {string} HTML pros and cons section
 */
function generateProsConsSection(product) {
  const pros = product.pros || [
    'Excellent value for money',
    'High quality construction',
    'Positive customer reviews',
    'Reliable performance'
  ];

  const cons = product.cons || [
    'May not include all premium features',
    'Competition offers similar options'
  ];

  return `
        <h3>Pros and Cons</h3>
        <div class="pros-cons-grid">
            <div class="pros">
                <h4>✅ What We Love</h4>
                <ul>
                    ${pros.slice(0, 4).map(pro => `<li>${pro}</li>`).join('\n                    ')}
                </ul>
            </div>
            <div class="cons">
                <h4>⚠️ Considerations</h4>
                <ul>
                    ${cons.slice(0, 3).map(con => `<li>${con}</li>`).join('\n                    ')}
                </ul>
            </div>
        </div>
    `;
}

/**
 * Generate user situations section
 * @param {object} product - Product object
 * @param {string} niche - The niche category
 * @returns {string} HTML user situations section
 */
function generateUserSituations(product, niche) {
  const nicheLower = niche.toLowerCase();
  let situations = [];

  if (nicheLower.includes('earbud') || nicheLower.includes('headphone')) {
    situations = [
      { title: 'Daily Commuters', description: 'Perfect for listening during your commute with reliable battery and comfortable fit.' },
      { title: 'Fitness Enthusiasts', description: 'Great for workouts with secure fit and sweat resistance.' },
      { title: 'Remote Workers', description: 'Ideal for video calls and focus time with clear audio quality.' }
    ];
  } else if (nicheLower.includes('camera')) {
    situations = [
      { title: 'Photography Hobbyists', description: 'Excellent for those learning photography with user-friendly controls.' },
      { title: 'Content Creators', description: 'Suitable for vloggers and social media content.' },
      { title: 'Travel Photographers', description: 'Compact and versatile for capturing travel memories.' }
    ];
  } else if (nicheLower.includes('laptop')) {
    situations = [
      { title: 'Students', description: 'Reliable for coursework, research, and online learning.' },
      { title: 'Professionals', description: 'Capable for productivity tasks and business applications.' },
      { title: 'Home Users', description: 'Perfect for web browsing, streaming, and everyday tasks.' }
    ];
  } else {
    situations = [
      { title: 'Everyday Users', description: 'Reliable performance for daily use and routine tasks.' },
      { title: 'Enthusiasts', description: 'Well-suited for those who want quality in their category.' },
      { title: 'Budget-Conscious Buyers', description: 'Excellent value for the price point.' }
    ];
  }

  return `
        <h3>Who Should Buy This?</h3>
        <ul>
            ${situations.map(s => `<li><strong>${s.title}:</strong> ${s.description}</li>`).join('\n            ')}
        </ul>
    `;
}

/**
 * Generate affiliate CTA section
 * @param {object} product - Product object
 * @param {string} niche - The niche category
 * @returns {string} HTML CTA section
 */
function generateAffiliateCTA(product, niche) {
  const productName = extractShortName(product.title || 'this product');

  return `
        <div class="blog-cta">
            <h3>Ready to Purchase?</h3>
            <p>If the ${productName} sounds like the right ${niche.toLowerCase()} for you, 
            we recommend checking the current price and availability on Amazon. 
            Prices can change frequently, and Amazon often has special deals and discounts.</p>
            <p><strong>Click the button below to view current pricing and read additional customer reviews:</strong></p>
        </div>
    `;
}

/**
 * Generate complete blog content
 * @param {object} product - Product object
 * @param {string} niche - The niche category
 * @param {number} rank - Product ranking
 * @returns {string} Complete HTML blog content (300-600 words)
 */
function generateBlogContent(product, niche, rank) {
  const productName = extractShortName(product.title || 'this product');
  const nicheLower = niche.toLowerCase();
  const rating = product.rating || '4.5';
  const reviews = product.reviews || 'many';
  const description = product.description || 'This product offers excellent value and performance in its category.';
  const year = new Date().getFullYear();

  // Introduction
  const intro = `
        <h2>Introduction</h2>
        <p>If you're in the market for ${nicheLower}, the ${productName} deserves your attention. 
        Currently ranked #${rank} in our comprehensive top 10 list, this product has earned recognition 
        from customers and reviewers alike.</p>
        <p>With a ${rating} out of 5-star rating based on ${reviews} customer reviews, 
        the ${productName} has established itself as a solid choice in the ${nicheLower} category in ${year}. 
        But what exactly makes it stand out? Let's examine the details.</p>
    `;

  // Product overview
  const overview = `
        <h2>Product Overview</h2>
        <p>${description}</p>
    `;

  // Specs table
  const specs = generateSpecsTable(product);

  // Key features
  const features = product.features || [];
  let featuresSection = '';
  if (features.length > 0) {
    featuresSection = `
        <h2>Key Features</h2>
        <ul>
            ${features.slice(0, 5).map(f => `<li>${f}</li>`).join('\n            ')}
        </ul>
    `;
  }

  // Pros and cons
  const prosConsSection = generateProsConsSection(product);

  // User situations
  const situationsSection = generateUserSituations(product, niche);

  // Verdict - extract ranking message for readability
  const rankingMessage = rank === 1
    ? 'As our top-ranked pick, it offers the best overall combination of features and value.'
    : `While ranked #${rank}, it offers specific strengths that may make it the ideal choice for your needs.`;

  const verdict = `
        <h2>Final Verdict</h2>
        <p>The ${productName} delivers solid performance for its price point. ${rankingMessage}</p>
        <p>We recommend this product for anyone seeking quality ${nicheLower} without overpaying. 
        The positive customer reviews and competitive pricing make it a smart purchase.</p>
    `;

  // CTA
  const ctaSection = generateAffiliateCTA(product, niche);

  return [intro, overview, specs, featuresSection, prosConsSection, situationsSection, verdict, ctaSection]
    .filter(s => s.trim())
    .join('\n');
}

/**
 * Estimate reading time
 * @param {string} content - HTML content
 * @returns {number} Estimated minutes to read
 */
function estimateReadingTime(content) {
  const wordsPerMinute = 200;
  const textOnly = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = textOnly.split(' ').filter(word => word.length > 0).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, minutes);
}

/**
 * Main function: Generate a complete blog article
 * @param {object} product - Product object with details
 * @param {string} niche - The niche category
 * @param {number} rank - Product ranking position
 * @returns {object} Blog content object with title, content, metaDescription, readingTime
 */
function writeBlogContent(product, niche, rank) {
  const title = generateBlogTitle(product, rank);
  const content = generateBlogContent(product, niche, rank);
  const metaDescription = generateMetaDescription(product, niche);
  const readingTime = estimateReadingTime(content);

  return {
    title,
    content,
    metaDescription,
    readingTime
  };
}

module.exports = {
  writeBlogContent,
  generateBlogTitle,
  generateBlogContent,
  generateMetaDescription
};
