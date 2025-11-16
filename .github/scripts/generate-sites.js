const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

// Environment variables
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || '';
const AMAZON_AFFILIATE_ID = process.env.AMAZON_AFFILIATE_ID || '';

// Read niches from CSV
function readNiches() {
  const csvPath = path.join(__dirname, '../../niches.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  return records;
}

// Helper function to create slug from keyword
function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

// Helper function to add affiliate tag to Amazon URL
function addAffiliateTag(url) {
  if (!AMAZON_AFFILIATE_ID) return url;
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('tag', AMAZON_AFFILIATE_ID);
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, append tag manually
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tag=${AMAZON_AFFILIATE_ID}`;
  }
}

// Function to fetch products from RapidAPI
async function fetchProducts(keyword, nodeId, numProducts) {
  console.log(`Fetching products for: ${keyword} (nodeId: ${nodeId})`);
  
  if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
    console.log('API credentials not found, using mock data...');
    return generateMockProducts(keyword, numProducts);
  }
  
  try {
    // Fetch products from API
    const response = await axios.get(`https://${RAPIDAPI_HOST}/search`, {
      params: {
        keyword: keyword,
        page: 1,
        country: 'US'
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 30000
    });
    
    if (response.data && response.data.data && response.data.data.products) {
      const products = response.data.data.products.slice(0, numProducts);
      return products.map((product, index) => ({
        title: product.product_title || `${keyword} Model ${index + 1}`,
        image: product.product_photo || 'https://via.placeholder.com/300x300?text=Product+Image',
        link: addAffiliateTag(product.product_url || `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`),
        price: product.product_price || 'Check Amazon',
        rating: product.product_star_rating ? `${product.product_star_rating}/5` : 'N/A',
        tagline: generateTagline(keyword, index),
        description: generateDescription(keyword, product.product_title || keyword, index),
        badge: getBadge(index),
        pros: generatePros(keyword),
        cons: generateCons(keyword)
      }));
    }
    
    throw new Error('No products found in API response');
  } catch (error) {
    console.error(`Error fetching products for ${keyword}:`, error.message);
    console.log('Using mock data...');
    return generateMockProducts(keyword, numProducts);
  }
}

// Generate badge based on rank
function getBadge(index) {
  const badges = [
    'Best Overall',
    'Best Value',
    "Editor's Choice",
    'Top Rated',
    'Premium Pick',
    'Budget Pick',
    'Best Features',
    'Most Popular',
    'Recommended',
    'Great Choice'
  ];
  return badges[index] || `Top ${index + 1}`;
}

// Generate tagline
function generateTagline(keyword, index) {
  const taglines = [
    `Best overall ${keyword} choice`,
    `Great value for money`,
    `Top-rated performance`,
    `Premium quality option`,
    `Budget-friendly excellence`,
    `Feature-rich model`,
    `Popular customer favorite`,
    `Reliable everyday choice`,
    `Quality meets affordability`,
    `Solid all-around performer`
  ];
  return taglines[index] || `Quality ${keyword}`;
}

// Generate description
function generateDescription(keyword, title, index) {
  const descriptions = [
    `This ${keyword} delivers exceptional performance and reliability for everyday use. Highly recommended by users and experts alike for its outstanding quality and features.`,
    `A great value option that doesn't compromise on quality. This ${keyword} offers excellent performance at a competitive price point, making it ideal for most users.`,
    `Premium construction and top-tier features make this ${keyword} stand out. Perfect for those who demand the best performance and are willing to invest in quality.`,
    `This ${keyword} strikes an excellent balance between features, performance, and price. It's a reliable choice that meets the needs of most users.`,
    `Budget-conscious shoppers will love this ${keyword}. Despite its affordable price, it delivers solid performance and essential features without breaking the bank.`,
    `Packed with features and built to last, this ${keyword} offers exceptional value. It's designed for users who want advanced capabilities without overpaying.`,
    `A customer favorite with thousands of positive reviews. This ${keyword} has proven its reliability and performance in real-world use.`,
    `This ${keyword} offers consistent, dependable performance day after day. It's designed for users who value reliability and quality construction.`,
    `An affordable option that still delivers on quality. This ${keyword} is perfect for those seeking a balance between cost and performance.`,
    `Solid build quality and reliable performance make this ${keyword} a smart choice. It offers everything most users need at a reasonable price.`
  ];
  return descriptions[index] || `This ${keyword} offers excellent value and performance for everyday use.`;
}

// Generate pros
function generatePros(keyword) {
  return [
    'Excellent build quality and materials',
    'Great performance and reliability',
    'Good value for the price',
    'Positive customer reviews'
  ];
}

// Generate cons
function generateCons(keyword) {
  return [
    'May not suit all preferences',
    'Limited color/style options available'
  ];
}

// Generate mock products
function generateMockProducts(keyword, numProducts) {
  console.log(`Generating ${numProducts} mock products for: ${keyword}`);
  
  return Array.from({ length: numProducts }, (_, i) => ({
    title: `${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} - Model ${i + 1}`,
    image: 'https://via.placeholder.com/300x300?text=Product+Image',
    link: addAffiliateTag(`https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`),
    price: `$${(Math.random() * 200 + 50).toFixed(2)}`,
    rating: `${(Math.random() * 1 + 4).toFixed(1)}/5`,
    tagline: generateTagline(keyword, i),
    description: generateDescription(keyword, keyword, i),
    badge: getBadge(i),
    pros: generatePros(keyword),
    cons: generateCons(keyword)
  }));
}

// Function to generate buyer's guide content
function generateBuyersGuide(keyword) {
  return [
    {
      title: 'Consider Your Budget',
      content: `Determine how much you're willing to spend on ${keyword}. Prices vary widely, so knowing your budget helps narrow down options and ensures you get the best value for your money.`
    },
    {
      title: 'Check Key Features',
      content: `Look for essential features that matter most for ${keyword}. Read specifications carefully, compare across different models, and prioritize features that align with your specific needs.`
    },
    {
      title: 'Read Customer Reviews',
      content: `Customer reviews provide valuable insights about real-world performance. Look for patterns in feedback rather than isolated comments, and pay attention to both positive and negative experiences.`
    },
    {
      title: 'Compare Brands',
      content: `Different brands offer varying quality levels, warranties, and customer service. Research brand reputation, read expert reviews, and consider long-term reliability when making your choice.`
    },
    {
      title: 'Think Long-Term',
      content: `Consider durability, warranty coverage, and future needs when selecting ${keyword}. Sometimes paying more upfront for better quality saves money in the long run through extended lifespan.`
    }
  ];
}

// Function to generate FAQ content
function generateFAQs(keyword) {
  return [
    {
      question: `What should I look for when buying ${keyword}?`,
      answer: `Focus on quality, features that match your needs, customer reviews, and warranty coverage. Compare multiple options before deciding, and ensure the product meets your specific requirements.`
    },
    {
      question: `Are expensive ${keyword} always better?`,
      answer: `Not necessarily. While price often correlates with quality, the best choice depends on your specific needs and budget. Many mid-range options offer excellent value and performance for most users.`
    },
    {
      question: `How do I know if these ${keyword} are right for me?`,
      answer: `Consider your use case, budget, and required features. Read reviews from users with similar needs to yours, and compare specifications across multiple products to find the best match.`
    },
    {
      question: `Where can I buy ${keyword}?`,
      answer: `All products listed here are available on Amazon with direct purchase links. Amazon offers reliable shipping, easy returns, and excellent customer service for peace of mind.`
    }
  ];
}

// Template rendering function (simple replacement)
function renderTemplate(template, data) {
  let result = template;
  
  // Handle simple variables {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
  
  // Function to process each loops recursively
  function processEachLoops(content, contextData, isNestedContext = false) {
    let processed = content;
    
    // Handle each loops - support both {{#each array}} and {{#each this.array}}
    const eachPattern = isNestedContext 
      ? /\{\{#each (?:this\.)?(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/
      : /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/;
    
    // Keep processing until no more each loops found
    let hasMatch = true;
    while (hasMatch) {
      hasMatch = false;
      processed = processed.replace(eachPattern, (match, arrayName, loopContent) => {
        hasMatch = true;
        const array = contextData[arrayName];
        if (!Array.isArray(array)) return '';
        
        return array.map((item, index) => {
          let itemContent = loopContent;
          
          // Replace {{@index}}
          itemContent = itemContent.replace(/\{\{@index\}\}/g, index);
          
          // Handle {{#unless @last}}...{{/unless}}
          const isLast = index === array.length - 1;
          itemContent = itemContent.replace(/\{\{#unless @last\}\}([\s\S]*?)\{\{\/unless\}\}/g, (m, unlessContent) => {
            return isLast ? '' : unlessContent;
          });
          
          // Handle {{increment @index}}
          itemContent = itemContent.replace(/\{\{increment @index\}\}/g, index + 1);
          
          // Replace {{this.property}} before processing nested loops
          itemContent = itemContent.replace(/\{\{this\.(\w+)\}\}/g, (m, prop) => {
            if (typeof item === 'object' && item !== null && item[prop] !== undefined) {
              const value = item[prop];
              // Don't replace if it's an array that will be processed by nested each
              if (Array.isArray(value)) return m;
              return value;
            }
            return '';
          });
          
          // Process nested loops if item is an object
          if (typeof item === 'object' && item !== null) {
            itemContent = processEachLoops(itemContent, item, true);
          }
          
          // Replace remaining {{this}} (after nested loops)
          itemContent = itemContent.replace(/\{\{this\}\}/g, typeof item === 'object' ? JSON.stringify(item) : item);
          
          return itemContent;
        }).join('');
      });
    }
    
    return processed;
  }
  
  result = processEachLoops(result, data);
  
  return result;
}

// Main function to process all niches
async function generateAllSites() {
  const sitesDir = path.join(__dirname, '../../sites');
  
  // Create sites directory
  if (!fs.existsSync(sitesDir)) {
    fs.mkdirSync(sitesDir, { recursive: true });
  }
  
  const niches = readNiches();
  console.log(`Processing ${niches.length} niches...`);
  
  const siteLinks = [];
  
  for (const niche of niches) {
    const slug = slugify(niche.keyword);
    const siteDir = path.join(sitesDir, slug);
    
    console.log(`\n=== Processing: ${niche.keyword} ===`);
    
    // Create site structure
    if (fs.existsSync(siteDir)) {
      fs.rmSync(siteDir, { recursive: true });
    }
    fs.mkdirSync(siteDir, { recursive: true });
    fs.mkdirSync(path.join(siteDir, 'assets', 'css'), { recursive: true });
    
    // Fetch products
    const products = await fetchProducts(niche.keyword, niche.nodeId, parseInt(niche.numProducts));
    console.log(`✓ Fetched ${products.length} products`);
    
    // Pre-render pros/cons as HTML to avoid nested template issues
    const productsWithRenderedLists = products.map(product => ({
      ...product,
      prosHtml: product.pros.map(p => `<li>${p}</li>`).join('\n                  '),
      consHtml: product.cons.map(c => `<li>${c}</li>`).join('\n                  ')
    }));
    
    // Generate content data
    const currentDate = new Date();
    const templateData = {
      keyword: niche.keyword,
      year: niche.year,
      updateDate: currentDate.toISOString().split('T')[0],
      updateDateFormatted: currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      siteUrl: `https://sc-connections.github.io/Top-10/sites/${slug}/`,
      basePath: '.',
      products: productsWithRenderedLists,
      guide: generateBuyersGuide(niche.keyword),
      faqs: generateFAQs(niche.keyword)
    };
    
    // Read template
    const templatePath = path.join(__dirname, '../../_layouts/top10.html');
    const template = fs.readFileSync(templatePath, 'utf-8');
    
    // Render template
    const renderedHtml = renderTemplate(template, templateData);
    
    // Save HTML file
    fs.writeFileSync(path.join(siteDir, 'index.html'), renderedHtml);
    console.log(`✓ Created index.html`);
    
    // Copy CSS
    const cssSource = path.join(__dirname, '../../assets/css/review.css');
    const cssDest = path.join(siteDir, 'assets/css/review.css');
    fs.copyFileSync(cssSource, cssDest);
    console.log(`✓ Copied CSS`);
    
    // Create README
    const readme = `# Top 10 ${niche.keyword} (${niche.year})

This site was automatically generated by the Top-10 niche-site generator.

## Products Listed

${products.map((p, i) => `${i + 1}. ${p.title}`).join('\n')}

## Last Updated

${templateData.updateDateFormatted}

## Affiliate Disclosure

This site contains Amazon affiliate links. We may earn a commission from qualifying purchases at no additional cost to you.
`;
    
    fs.writeFileSync(path.join(siteDir, 'README.md'), readme);
    console.log(`✓ Created README`);
    
    console.log(`✓ Site generated for ${niche.keyword}`);
    
    // Save for index
    siteLinks.push({
      keyword: niche.keyword,
      year: niche.year,
      slug: slug,
      path: `sites/${slug}/index.html`
    });
  }
  
  // Create main index.html
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Top 10 Review Sites - SC Connections</title>
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      max-width: 900px; 
      margin: 40px auto; 
      padding: 20px; 
      background: #0d0f12; 
      color: #eaeef5; 
      line-height: 1.6;
    }
    h1 { 
      color: #5aa9ff; 
      margin-bottom: 10px;
      font-size: 2rem;
    }
    .subtitle {
      color: #8a94a6;
      margin-bottom: 30px;
    }
    ul { 
      list-style: none; 
      padding: 0; 
    }
    li { 
      margin: 15px 0; 
      padding: 20px; 
      background: #15181d; 
      border: 1px solid #222831; 
      border-radius: 12px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    li:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(0,0,0,.3);
    }
    a { 
      color: #5aa9ff; 
      text-decoration: none; 
      font-size: 1.15rem; 
      font-weight: 600;
      display: block;
    }
    a:hover { 
      text-decoration: underline; 
    }
    .year {
      color: #8a94a6;
      font-size: 0.9rem;
      margin-top: 5px;
    }
    .footer { 
      margin-top: 50px; 
      padding-top: 20px; 
      border-top: 1px solid #222831; 
      color: #8a94a6; 
      font-size: 0.9rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>🔟 Top 10 Review Sites</h1>
  <p class="subtitle">Automated niche-site generator for product reviews</p>
  <ul>
${siteLinks.map(site => `    <li>
      <a href="${site.path}">Top 10 ${site.keyword} (${site.year})</a>
      <div class="year">Updated for ${site.year}</div>
    </li>`).join('\n')}
  </ul>
  <div class="footer">
    <p>Auto-generated by GitHub Actions • Last updated: ${new Date().toLocaleString()}</p>
    <p>All sites contain Amazon affiliate links</p>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(__dirname, '../../index.html'), indexHtml);
  console.log('\n✓ Created main index.html');
  
  console.log('\n=== All sites generated successfully! ===');
  console.log(`Total sites: ${siteLinks.length}`);
  console.log(`Output directory: ${sitesDir}`);
}

// Run the script
if (require.main === module) {
  generateAllSites().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generateAllSites };
