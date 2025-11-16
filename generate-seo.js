/**
 * SEO Content Generator
 * Generates SEO-optimized content for niche sites
 */

/**
 * Generate intro paragraph for the main page
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects
 * @returns {string} HTML content for intro paragraph
 */
function generateIntroContent(niche, products) {
    const year = new Date().getFullYear();
    const avgRating = products.length > 0 
        ? (products.reduce((sum, p) => sum + (parseFloat(p.rating) || 4.0), 0) / products.length).toFixed(1)
        : '4.5';
    
    const content = `
        <p>Finding the perfect ${niche.toLowerCase()} can be overwhelming with so many options available in ${year}. 
        We've analyzed thousands of customer reviews, expert opinions, and real-world testing data to bring you 
        this comprehensive guide to the top 10 ${niche.toLowerCase()} on the market today.</p>
        
        <p>Our selection features products with an average rating of ${avgRating} stars or higher, ensuring you get 
        only the best quality options. Whether you're a first-time buyer or looking to upgrade, this list will help 
        you make an informed decision based on performance, value, and customer satisfaction.</p>
        
        <p>This guide is updated daily with the latest pricing, availability, and customer feedback from Amazon, 
        so you always have access to current information when making your purchase decision.</p>
    `;
    
    return content.trim();
}

/**
 * Generate buyer's guide content
 * @param {string} niche - The niche category
 * @returns {string} HTML content for buyer's guide
 */
function generateBuyersGuide(niche) {
    const nicheFactors = getBuyingFactors(niche);
    
    const content = `
        <p>Choosing the right ${niche.toLowerCase()} requires careful consideration of several key factors. 
        This guide will help you understand what to look for to ensure you make the best purchase for your needs.</p>
        
        <h3>Key Factors to Consider</h3>
        <ul>
            ${nicheFactors.map(factor => `<li><strong>${factor.name}:</strong> ${factor.description}</li>`).join('\n            ')}
        </ul>
        
        <h3>Budget Considerations</h3>
        <p>The ${niche.toLowerCase()} market offers options at various price points. Premium models typically range 
        from $100-$500+ and offer advanced features, superior build quality, and better performance. Mid-range options 
        ($50-$100) provide excellent value, balancing quality and affordability. Budget-friendly choices (under $50) 
        can still deliver good performance for casual users.</p>
        
        <h3>Brand Reputation</h3>
        <p>Established brands often provide better customer support, warranty coverage, and product reliability. 
        However, newer brands can offer innovative features at competitive prices. Always check customer reviews 
        and ratings before making your final decision.</p>
        
        <h3>Making Your Final Decision</h3>
        <p>Consider your specific needs, budget, and intended use. Read customer reviews to understand real-world 
        performance. Check return policies and warranty terms. Compare multiple options from our top 10 list to 
        find the perfect match for your requirements.</p>
    `;
    
    return content.trim();
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
        { name: "Quality and Durability", description: "Look for well-built products with quality materials that will last" },
        { name: "Price and Value", description: "Consider the overall value, not just the lowest price" },
        { name: "Customer Reviews", description: "Check ratings and reviews from verified purchasers" },
        { name: "Brand Reputation", description: "Choose reputable brands with good customer support" },
        { name: "Warranty and Support", description: "Ensure adequate warranty coverage and customer service" }
    ];
    
    // Niche-specific factors
    if (nicheLower.includes('earbud') || nicheLower.includes('headphone')) {
        return [
            { name: "Sound Quality", description: "Clear audio with good bass, mids, and treble balance" },
            { name: "Battery Life", description: "Look for at least 6-8 hours of continuous playback" },
            { name: "Comfort and Fit", description: "Ensure they stay secure and comfortable during extended use" },
            { name: "Connectivity", description: "Reliable Bluetooth connection with minimal dropouts" },
            { name: "Noise Cancellation", description: "Active or passive noise cancellation for immersive audio" }
        ];
    } else if (nicheLower.includes('camera')) {
        return [
            { name: "Image Quality", description: "Megapixel count, sensor size, and image processing capabilities" },
            { name: "Lens Options", description: "Interchangeable lenses or versatile zoom range" },
            { name: "Video Capabilities", description: "4K video recording and frame rate options" },
            { name: "Autofocus Performance", description: "Fast and accurate autofocus system" },
            { name: "Build Quality", description: "Weather sealing and durable construction" }
        ];
    } else if (nicheLower.includes('microphone')) {
        return [
            { name: "Audio Quality", description: "Clear capture with minimal background noise" },
            { name: "Polar Pattern", description: "Cardioid, omnidirectional, or adjustable patterns" },
            { name: "Connectivity", description: "USB, XLR, or wireless connection options" },
            { name: "Build Quality", description: "Sturdy construction and reliable components" },
            { name: "Compatibility", description: "Works with your computer, console, or device" }
        ];
    } else if (nicheLower.includes('laptop')) {
        return [
            { name: "Performance", description: "Processor speed, RAM, and overall system responsiveness" },
            { name: "Battery Life", description: "All-day battery for portability and productivity" },
            { name: "Display Quality", description: "Screen resolution, brightness, and color accuracy" },
            { name: "Portability", description: "Weight and size for easy transport" },
            { name: "Storage", description: "SSD capacity for fast file access and storage needs" }
        ];
    }
    
    return defaultFactors;
}

/**
 * Generate FAQ section
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects
 * @returns {string} HTML content for FAQ section
 */
function generateFAQ(niche, products) {
    const faqs = generateFAQQuestions(niche, products);
    
    const faqHTML = faqs.map(faq => `
        <div class="faq-item">
            <h3 class="faq-question">${faq.question}</h3>
            <p class="faq-answer">${faq.answer}</p>
        </div>
    `).join('\n');
    
    return faqHTML;
}

/**
 * Generate FAQ questions and answers
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects
 * @returns {Array} Array of FAQ objects
 */
function generateFAQQuestions(niche, products) {
    const avgPrice = products.length > 0
        ? Math.round(products.reduce((sum, p) => {
            const price = parseFloat((p.price || '').replace(/[^0-9.]/g, ''));
            return sum + (isNaN(price) ? 100 : price);
        }, 0) / products.length)
        : 100;
    
    const topBrand = products.length > 0 && products[0].title 
        ? products[0].title.split(' ')[0] 
        : 'leading';
    
    return [
        {
            question: `What are the best ${niche.toLowerCase()} in ${new Date().getFullYear()}?`,
            answer: `Based on our comprehensive analysis of customer reviews, expert testing, and real-world performance, 
            the top ${niche.toLowerCase()} include options from ${topBrand} and other leading brands. Our top 10 list features 
            products that excel in quality, performance, and value. Each product has been selected based on ratings of 4 stars 
            or higher and positive customer feedback.`
        },
        {
            question: `How much should I spend on ${niche.toLowerCase()}?`,
            answer: `The price range for quality ${niche.toLowerCase()} varies significantly. Budget options start around $30-50 
            and can provide good basic functionality. Mid-range products ($50-150) offer the best balance of features and value 
            for most users. Premium options ($150+) deliver top-tier performance and advanced features. The average price in our 
            top 10 list is approximately $${avgPrice}, which represents excellent value for quality products.`
        },
        {
            question: `Are expensive ${niche.toLowerCase()} worth it?`,
            answer: `Higher-priced ${niche.toLowerCase()} often offer better build quality, advanced features, superior performance, 
            and longer lifespan. However, the "worth" depends on your specific needs and usage. Casual users may find mid-range 
            options perfectly adequate, while professionals or enthusiasts might benefit from premium features. Consider your budget 
            and requirements when making your decision.`
        },
        {
            question: `How often should I replace my ${niche.toLowerCase()}?`,
            answer: `The lifespan of ${niche.toLowerCase()} varies based on quality, usage, and care. Quality products typically last 
            2-5 years with regular use. Signs you may need a replacement include decreased performance, physical damage, or outdated 
            features. Regular maintenance and proper care can extend the life of your ${niche.toLowerCase()}.`
        },
        {
            question: `What should I look for when buying ${niche.toLowerCase()}?`,
            answer: `Key factors include quality and durability, customer reviews and ratings, brand reputation, price-to-value ratio, 
            warranty coverage, and specific features that match your needs. Our buyer's guide above provides detailed information on 
            each important consideration. Always read customer reviews to understand real-world performance and potential issues.`
        }
    ];
}

/**
 * Generate structured data for FAQ section
 * @param {string} niche - The niche category
 * @param {Array} products - Array of product objects
 * @returns {object} FAQ structured data object
 */
function generateFAQStructuredData(niche, products) {
    const faqs = generateFAQQuestions(niche, products);
    
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };
}

/**
 * Generate CTA (Call to Action) content
 * @param {string} niche - The niche category
 * @returns {string} HTML content for CTA section
 */
function generateCTA(niche) {
    const content = `
        <h2>Ready to Choose Your Perfect ${niche}?</h2>
        <p>We've done the research, compared the options, and presented the top 10 ${niche.toLowerCase()} 
        available today. Each product in our list offers excellent value, quality, and customer satisfaction.</p>
        <p>Click any "View on Amazon" button above to check current prices, read more customer reviews, 
        and make your purchase with confidence. Our recommendations are updated daily to ensure you always 
        have access to the latest information.</p>
    `;
    
    return content.trim();
}

module.exports = {
    generateIntroContent,
    generateBuyersGuide,
    generateFAQ,
    generateFAQStructuredData,
    generateCTA
};
