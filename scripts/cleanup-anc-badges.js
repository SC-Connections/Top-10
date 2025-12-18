#!/usr/bin/env node
/**
 * Clean up ANC badges from existing generated HTML files
 * This is a one-time cleanup script to remove ANC references from already-generated pages
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Cleaning up ANC references from generated HTML files...\n');

// Find all niche directories (directories with index.html)
const rootDir = path.join(__dirname, '..');
const entries = fs.readdirSync(rootDir, { withFileTypes: true });

let cleanedCount = 0;
let filesProcessed = 0;

for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const dirPath = path.join(rootDir, entry.name);
    const indexPath = path.join(dirPath, 'index.html');
    
    // Skip if not a niche directory
    if (!fs.existsSync(indexPath)) continue;
    
    // Check if this directory has ANC references
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    
    if (indexContent.includes('<span class="highlight-label">ANC</span>')) {
        console.log(`  🔍 Found ANC badges in: ${entry.name}/index.html`);
        
        // Remove ANC badge divs (the entire highlight-item div containing ANC)
        let newContent = indexContent;
        
        // Pattern to match the entire ANC highlight-item div
        const ancPattern = /<div class="highlight-item">\s*<span class="highlight-icon">🔇<\/span>\s*<span class="highlight-label">ANC<\/span>\s*<span class="highlight-value">[^<]*<\/span>\s*<\/div>/g;
        
        newContent = newContent.replace(ancPattern, '');
        
        if (newContent !== indexContent) {
            fs.writeFileSync(indexPath, newContent, 'utf-8');
            console.log(`    ✅ Cleaned: ${entry.name}/index.html`);
            cleanedCount++;
        }
        
        filesProcessed++;
    }
    
    // Also check blog files
    const blogDir = path.join(dirPath, 'blog');
    if (fs.existsSync(blogDir)) {
        const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
        
        for (const blogFile of blogFiles) {
            const blogPath = path.join(blogDir, blogFile);
            const blogContent = fs.readFileSync(blogPath, 'utf-8');
            
            if (blogContent.includes('<span class="highlight-label">ANC</span>')) {
                let newBlogContent = blogContent;
                const ancPattern = /<div class="highlight-item">\s*<span class="highlight-icon">🔇<\/span>\s*<span class="highlight-label">ANC<\/span>\s*<span class="highlight-value">[^<]*<\/span>\s*<\/div>/g;
                
                newBlogContent = newBlogContent.replace(ancPattern, '');
                
                if (newBlogContent !== blogContent) {
                    fs.writeFileSync(blogPath, newBlogContent, 'utf-8');
                    cleanedCount++;
                }
            }
        }
    }
}

console.log(`\n✅ Cleanup complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files cleaned: ${cleanedCount}`);

if (cleanedCount > 0) {
    console.log('\n📝 ANC badges have been removed from existing HTML files.');
    console.log('   These changes will be committed in the next workflow run.');
}
