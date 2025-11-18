/**
 * Validation script to check generated sites
 * Verifies that all Amazon links and images are correctly formatted
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const AFFILIATE_TAG = 'scconnec0d-20';
const NICHES_DATA_FILE = path.join(ROOT_DIR, '_niches_data.json');

function validateSites() {
    console.log('🔍 Validating generated sites...\n');
    
    // Read niches from _niches_data.json
    let niches = [];
    if (fs.existsSync(NICHES_DATA_FILE)) {
        const nichesData = JSON.parse(fs.readFileSync(NICHES_DATA_FILE, 'utf-8'));
        niches = nichesData.map(n => n.slug);
    } else {
        // Fallback: scan root directory for niche directories
        console.log('⚠️  _niches_data.json not found, scanning root directory...\n');
        const excludeDirs = ['.git', '.github', 'node_modules', 'templates', 'assets', '_layouts', 'data'];
        niches = fs.readdirSync(ROOT_DIR).filter(dir => {
            const dirPath = path.join(ROOT_DIR, dir);
            return fs.statSync(dirPath).isDirectory() && 
                   !excludeDirs.includes(dir) &&
                   !dir.startsWith('.') &&
                   fs.existsSync(path.join(dirPath, 'index.html'));
        });
    }
    
    if (niches.length === 0) {
        console.log('❌ No niche sites found. Run site-generator.js first.');
        return false;
    }
    
    console.log(`📋 Found ${niches.length} niche sites to validate\n`);
    
    let allValid = true;
    
    for (const niche of niches) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📦 Validating: ${niche}`);
        console.log('='.repeat(60));
        
        const nichePath = path.join(ROOT_DIR, niche);
        const indexPath = path.join(nichePath, 'index.html');
        
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
        
        // Check for valid Amazon image CDN URLs (more precise check)
        const amazonImages = imageUrls.filter(url => {
            try {
                // Extract URL from match
                const urlMatch = url.match(/src="([^"]+)"/);
                if (!urlMatch) return false;
                const parsedUrl = new URL(urlMatch[1]);
                // Check if hostname ends with amazon.com (prevents subdomain attacks)
                return parsedUrl.hostname.endsWith('.media-amazon.com') || 
                       parsedUrl.hostname.endsWith('.ssl-images-amazon.com') ||
                       parsedUrl.hostname === 'images-na.ssl-images-amazon.com';
            } catch (e) {
                return false;
            }
        });
        console.log(`✓ ${amazonImages.length} images use Amazon CDN`);
        
        // Check blog directory
        const blogDir = path.join(nichePath, 'blog');
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
        
        // Check CSS file - look for both styles.css and global.css
        const cssPath1 = path.join(nichePath, 'styles.css');
        const cssPath2 = path.join(nichePath, 'global.css');
        if (fs.existsSync(cssPath1) || fs.existsSync(cssPath2)) {
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
