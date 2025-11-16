/**
 * Blog Content Generator
 * Generates detailed product review articles
 */

/**
 * Generate a complete blog article for a product
 * @param {object} product - Product object with details
 * @param {string} niche - The niche category
 * @param {number} rank - Product ranking position
 * @returns {object} Blog content object
 */
function generateBlogArticle(product, niche, rank) {
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

/**
 * Generate blog title
 * @param {object} product - Product object
 * @param {number} rank - Product ranking
 * @returns {string} Blog title
 */
function generateBlogTitle(product, rank) {
    const productName = product.title || 'Product';
    const titles = [
        `${productName} Review: Is It Worth Your Money in ${new Date().getFullYear()}?`,
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
    const productName = product.title || 'this product';
    const rating = product.rating || '4.5';
    
    return `Detailed review of ${productName}. Rated ${rating}/5 stars. See features, pros, cons, and why it's one of the best ${niche.toLowerCase()} in ${new Date().getFullYear()}.`;
}

/**
 * Generate main blog content
 * @param {object} product - Product object
 * @param {string} niche - The niche category
 * @param {number} rank - Product ranking
 * @returns {string} HTML blog content
 */
function generateBlogContent(product, niche, rank) {
    const sections = [
        generateIntroSection(product, niche, rank),
        generateOverviewSection(product),
        generateKeyFeaturesSection(product),
        generatePerformanceSection(product, niche),
        generateProsConsSection(product),
        generateUseCasesSection(product, niche),
        generateComparisonSection(product, niche, rank),
        generateConclusionSection(product, rank)
    ];
    
    return sections.join('\n\n');
}

/**
 * Generate introduction section
 */
function generateIntroSection(product, niche, rank) {
    const productName = product.title || 'this product';
    const rating = product.rating || '4.5';
    const reviewCount = product.reviews || 'hundreds of';
    
    return `
        <h2>Introduction</h2>
        <p>If you're in the market for ${niche.toLowerCase()}, you've likely come across the ${productName}. 
        Currently ranked #${rank} in our comprehensive top 10 list, this product has gained significant attention 
        from customers and experts alike.</p>
        
        <p>With an impressive ${rating} out of 5-star rating based on ${reviewCount} customer reviews, 
        the ${productName} has proven itself as a reliable choice in the ${niche.toLowerCase()} category. 
        But what makes it stand out from the competition? Let's dive into the details.</p>
    `;
}

/**
 * Generate overview section
 */
function generateOverviewSection(product) {
    const description = product.description || 'This product offers excellent value and performance in its category.';
    
    return `
        <h2>Product Overview</h2>
        <p>${description}</p>
        
        <p>This product is designed to meet the needs of both casual users and enthusiasts. Its combination of 
        quality construction, user-friendly features, and competitive pricing makes it an attractive option for 
        anyone looking to make a smart purchase.</p>
    `;
}

/**
 * Generate key features section
 */
function generateKeyFeaturesSection(product) {
    const features = product.features || [];
    
    let content = `
        <h2>Key Features and Specifications</h2>
        <p>Let's break down the standout features that make this product worth considering:</p>
    `;
    
    if (features.length > 0) {
        content += `
        <ul>
            ${features.map(feature => `<li><strong>${feature}</strong> - This feature enhances the overall user experience and adds significant value.</li>`).join('\n            ')}
        </ul>
        `;
    } else {
        content += `
        <p>This product includes carefully selected features that balance performance, usability, and value. 
        Each component has been designed with the end user in mind, ensuring a positive experience whether 
        you're a first-time buyer or an experienced user.</p>
        `;
    }
    
    return content;
}

/**
 * Generate performance section
 */
function generatePerformanceSection(product, niche) {
    return `
        <h2>Performance and Real-World Testing</h2>
        <p>In real-world use, this product delivers on its promises. The performance is consistent and reliable, 
        meeting the expectations set by its specifications and marketing materials.</p>
        
        <p>Users report positive experiences across various use cases, from casual daily use to more demanding 
        applications. The build quality inspires confidence, and the product feels premium despite its competitive 
        price point.</p>
        
        <p>When compared to other ${niche.toLowerCase()} in the same price range, this product holds its own and 
        often exceeds expectations. The attention to detail in both design and functionality is evident in every 
        aspect of the user experience.</p>
    `;
}

/**
 * Generate pros and cons section
 */
function generateProsConsSection(product) {
    const pros = product.pros || [
        'Excellent value for money',
        'High quality construction',
        'Positive customer reviews',
        'Reliable performance',
        'Good customer support'
    ];
    
    const cons = product.cons || [
        'May not include all premium features',
        'Competition offers similar options',
        'Availability may vary'
    ];
    
    return `
        <h2>Pros and Cons</h2>
        
        <h3>What We Love (Pros)</h3>
        <ul>
            ${pros.map(pro => `<li>${pro}</li>`).join('\n            ')}
        </ul>
        
        <h3>Areas for Improvement (Cons)</h3>
        <ul>
            ${cons.map(con => `<li>${con}</li>`).join('\n            ')}
        </ul>
        
        <p>While no product is perfect, the advantages significantly outweigh the drawbacks. The cons listed above 
        are relatively minor and may not be deal-breakers for most users.</p>
    `;
}

/**
 * Generate use cases section
 */
function generateUseCasesSection(product, niche) {
    const nicheLower = niche.toLowerCase();
    
    let useCases = [];
    
    if (nicheLower.includes('earbud') || nicheLower.includes('headphone')) {
        useCases = [
            { title: 'Daily Commute', description: 'Perfect for your daily commute with reliable connectivity and comfortable fit for extended wear.' },
            { title: 'Workout Sessions', description: 'Secure fit and sweat resistance make it ideal for gym sessions and outdoor activities.' },
            { title: 'Work From Home', description: 'Clear audio quality for video calls and virtual meetings throughout the workday.' }
        ];
    } else if (nicheLower.includes('camera')) {
        useCases = [
            { title: 'Photography Enthusiasts', description: 'Ideal for hobbyists looking to improve their photography skills with advanced features.' },
            { title: 'Content Creators', description: 'Perfect for vloggers and content creators who need reliable video and photo capabilities.' },
            { title: 'Travel Photography', description: 'Compact and versatile enough for capturing memories during your travels.' }
        ];
    } else if (nicheLower.includes('microphone')) {
        useCases = [
            { title: 'Streaming and Gaming', description: 'Clear voice capture for streamers and gamers who want professional audio quality.' },
            { title: 'Podcasting', description: 'Excellent for podcasters seeking broadcast-quality audio without breaking the bank.' },
            { title: 'Video Calls', description: 'Crystal clear audio for remote work and virtual meetings.' }
        ];
    } else if (nicheLower.includes('laptop')) {
        useCases = [
            { title: 'Students', description: 'Reliable performance for coursework, research, and online learning.' },
            { title: 'Professionals', description: 'Adequate power for productivity tasks and business applications.' },
            { title: 'Casual Users', description: 'Perfect for web browsing, streaming, and everyday computing needs.' }
        ];
    } else {
        useCases = [
            { title: 'Everyday Use', description: 'Reliable performance for daily tasks and routine activities.' },
            { title: 'Specific Applications', description: 'Well-suited for its intended purpose with excellent results.' },
            { title: 'Long-term Value', description: 'A solid investment that will serve you well over time.' }
        ];
    }
    
    return `
        <h2>Who Should Buy This?</h2>
        <p>This product is ideal for several types of users:</p>
        
        ${useCases.map(useCase => `
        <h3>${useCase.title}</h3>
        <p>${useCase.description}</p>
        `).join('\n')}
        
        <p>Whether you fall into one of these categories or have different needs, this product's versatility 
        makes it a safe choice for a wide range of users.</p>
    `;
}

/**
 * Generate comparison section
 */
function generateComparisonSection(product, niche, rank) {
    return `
        <h2>How It Compares to Alternatives</h2>
        <p>When compared to other ${niche.toLowerCase()} in our top 10 list, this product offers a compelling 
        combination of features and value. ${rank === 1 ? 'As our top-ranked option, it stands out for its overall excellence.' : 
        `While ranked #${rank}, it offers specific advantages that may make it the perfect choice for your needs.`}</p>
        
        <p>The price-to-performance ratio is competitive, and the product often matches or exceeds the capabilities 
        of more expensive alternatives. If you're looking for the best bang for your buck, this is definitely worth 
        serious consideration.</p>
        
        <p>We recommend comparing this product with our other top picks to find the perfect match for your specific 
        requirements and budget. Each product in our top 10 list has unique strengths that may align better with 
        your individual needs.</p>
    `;
}

/**
 * Generate conclusion section
 */
function generateConclusionSection(product, rank) {
    const productName = product.title || 'this product';
    
    return `
        <h2>Final Verdict</h2>
        <p>After thorough analysis and consideration of customer feedback, we confidently recommend the ${productName} 
        as ${rank === 1 ? 'our top choice' : `an excellent option ranked #${rank} in our comprehensive list`}.</p>
        
        <p>It delivers on its promises with reliable performance, quality construction, and features that matter to 
        real users. The positive customer reviews and ratings speak volumes about its real-world performance and 
        customer satisfaction.</p>
        
        <p>Whether you're upgrading from an older model or making your first purchase, this product represents 
        excellent value and a smart investment. We encourage you to check the current price on Amazon, read 
        additional customer reviews, and make your purchase with confidence.</p>
        
        <p><strong>Bottom Line:</strong> A solid choice that combines quality, performance, and value. Highly 
        recommended for anyone in the market for this type of product.</p>
    `;
}

/**
 * Estimate reading time
 * @param {string} content - HTML content
 * @returns {number} Estimated minutes to read
 */
function estimateReadingTime(content) {
    const wordsPerMinute = 200;
    // Remove HTML tags for word counting - content is programmatically generated, not user input
    // Using multiple passes to handle nested and complex HTML structures
    let text = content;
    // Remove script and style tags and their content
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    // Decode common HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    // Count words
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(1, minutes);
}

module.exports = {
    generateBlogArticle
};
