/**
 * Validation script to check generated sites
 * Verifies that all Amazon links and images are correctly formatted
 */

const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, 'sites');
const AFFILIATE_TAG = 'scconnec0d-20';

function validateSites() {
    console.log('🔍 Validating generated sites...\n');
    
    if (!fs.existsSync(SITES_DIR)) {
        console.log('❌ Sites directory not found. Run site-generator.js first.');
        return false;
    }
    
    const niches = fs.readdirSync(SITES_DIR).filter(dir => {
        const dirPath = path.join(SITES_DIR, dir);
        return fs.statSync(dirPath).isDirectory() && dir !== '_niches_data.json';
    });
    
    console.log(`📋 Found ${niches.length} niche sites to validate\n`);
    
    let allValid = true;
    
    for (const niche of niches) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📦 Validating: ${niche}`);
        console.log('='.repeat(60));
        
        const indexPath = path.join(SITES_DIR, niche, 'index.html');
        if (!fs.existsSync(indexPath)) {
            console.log('❌ index.html not found');
            allValid = false;
            continue;
        }
        
        const content = fs.readFileSync(indexPath, 'utf-8');
        
        // Check for Amazon links with affiliate tag
        const amazonLinks = content.match(/https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]+\?tag=[^"'\s]+/g) || [];
        console.log(`✓ Found ${amazonLinks.length} Amazon links`);
        
        // Validate affiliate tag in links
        const linksWithCorrectTag = amazonLinks.filter(link => link.includes(`tag=${AFFILIATE_TAG}`));
        if (linksWithCorrectTag.length === amazonLinks.length && amazonLinks.length > 0) {
            console.log(`✓ All Amazon links have correct affiliate tag (${AFFILIATE_TAG})`);
        } else {
            console.log(`❌ Some Amazon links missing correct affiliate tag`);
            allValid = false;
        }
        
        // Check for placeholder images (should not exist)
        const placeholderImages = content.match(/placeholder|ffffff/gi) || [];
        if (placeholderImages.length === 0) {
            console.log('✓ No placeholder images found');
        } else {
            console.log(`❌ Found ${placeholderImages.length} placeholder image references`);
            allValid = false;
        }
        
        // Check for absolute image URLs
        const imageUrls = content.match(/src="(https?:\/\/[^"]+)"/g) || [];
        console.log(`✓ Found ${imageUrls.length} absolute image URLs`);
        
        // Check for valid Amazon image CDN URLs
        const amazonImages = imageUrls.filter(url => url.includes('amazon.com') || url.includes('media-amazon'));
        console.log(`✓ ${amazonImages.length} images use Amazon CDN`);
        
        // Check blog directory
        const blogDir = path.join(SITES_DIR, niche, 'blog');
        if (fs.existsSync(blogDir)) {
            const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
            console.log(`✓ Found ${blogFiles.length} blog articles`);
            
            // Validate one blog file
            if (blogFiles.length > 0) {
                const blogContent = fs.readFileSync(path.join(blogDir, blogFiles[0]), 'utf-8');
                const blogAmazonLinks = blogContent.match(/https:\/\/www\.amazon\.com\/dp\/[A-Z0-9]+\?tag=[^"'\s]+/g) || [];
                const blogLinksCorrect = blogAmazonLinks.every(link => link.includes(`tag=${AFFILIATE_TAG}`));
                if (blogLinksCorrect) {
                    console.log('✓ Blog pages have correct Amazon links');
                } else {
                    console.log('❌ Blog pages have incorrect Amazon links');
                    allValid = false;
                }
            }
        }
        
        // Check CSS file
        const cssPath = path.join(SITES_DIR, niche, 'global.css');
        if (fs.existsSync(cssPath)) {
            console.log('✓ CSS file exists');
        } else {
            console.log('❌ CSS file missing');
            allValid = false;
        }
    }
    
    console.log('\n' + '='.repeat(60));
    if (allValid) {
        console.log('✅ All validations passed!');
    } else {
        console.log('❌ Some validations failed. Please review the output above.');
    }
    console.log('='.repeat(60) + '\n');
    
    return allValid;
}

// Run validation
if (require.main === module) {
    const isValid = validateSites();
    process.exit(isValid ? 0 : 1);
}

module.exports = { validateSites };
