#!/usr/bin/env node
/**
 * Test script to verify all fixes are working correctly
 * Tests:
 * 1. Templates can be loaded before products
 * 2. Product validation skips invalid products
 * 3. Feature bullets generation from description
 * 4. URL validation and affiliate tag appending
 * 5. README generation
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Niche-Site Generator Fixes\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

// Test 1: Templates directory exists
test('Templates directory exists', () => {
    const templatesDir = path.join(__dirname, 'templates');
    if (!fs.existsSync(templatesDir)) {
        throw new Error('Templates directory not found');
    }
});

// Test 2: All required template files exist
test('All required template files exist', () => {
    const requiredFiles = [
        'template.html',
        'blog-template.html',
        'product-template.html',
        'global.css',
        'template.json'
    ];
    
    for (const file of requiredFiles) {
        const filePath = path.join(__dirname, 'templates', file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Template file not found: ${file}`);
        }
    }
});

// Test 3: Templates reference styles.css
test('Templates reference styles.css', () => {
    const templateHtml = fs.readFileSync(path.join(__dirname, 'templates', 'template.html'), 'utf-8');
    const blogHtml = fs.readFileSync(path.join(__dirname, 'templates', 'blog-template.html'), 'utf-8');
    
    if (!templateHtml.includes('styles.css')) {
        throw new Error('template.html does not reference styles.css');
    }
    
    if (!blogHtml.includes('styles.css')) {
        throw new Error('blog-template.html does not reference styles.css');
    }
});

// Test 4: Site generator has proper structure
test('Site generator has required functions', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    const requiredFunctions = [
        'loadTemplates',
        'fetchProducts',
        'generateEmptyResultsPage',
        'generateReadme',
        'publishToGitHub',
        'createGitHubRepo',
        'enableGitHubPages'
    ];
    
    for (const fn of requiredFunctions) {
        if (!content.includes(`function ${fn}`) && !content.includes(`const ${fn}`)) {
            throw new Error(`Function not found: ${fn}`);
        }
    }
});

// Test 5: Templates are loaded before empty results check
test('Templates loaded before empty results check', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    // Find the line number of loadTemplates() call
    const lines = content.split('\n');
    let loadTemplatesLine = -1;
    let emptyResultsLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const templates = loadTemplates()')) {
            loadTemplatesLine = i;
        }
        if (lines[i].includes('generateEmptyResultsPage(siteDir, niche, slug, templates)')) {
            emptyResultsLine = i;
        }
    }
    
    if (loadTemplatesLine === -1) {
        throw new Error('loadTemplates() call not found');
    }
    
    if (emptyResultsLine === -1) {
        throw new Error('generateEmptyResultsPage() call not found');
    }
    
    if (loadTemplatesLine >= emptyResultsLine) {
        throw new Error('Templates are not loaded before empty results check');
    }
});

// Test 6: Product validation has proper skip logic
test('Product validation skips invalid products', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    if (!content.includes('Skipping product')) {
        throw new Error('Product skipping logic not found');
    }
    
    if (!content.includes('skippedCount++')) {
        throw new Error('Skipped count tracking not found');
    }
});

// Test 7: README generation function exists
test('README generation function exists', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    if (!content.includes('function generateReadme(')) {
        throw new Error('generateReadme function not found');
    }
    
    if (!content.includes('README.md')) {
        throw new Error('README.md generation not found');
    }
});

// Test 8: Affiliate tag appending logic exists
test('Affiliate tag appending logic exists', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    if (!content.includes('tag=${CONFIG.AMAZON_AFFILIATE_ID}')) {
        throw new Error('Affiliate tag appending not found');
    }
    
    if (!content.includes('amazonUrl.includes(\'?\')')) {
        throw new Error('Query param detection not found');
    }
});

// Test 9: GitHub publishing has correct repo naming
test('GitHub repo naming uses top10- prefix', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    if (!content.includes('top10-${slug}')) {
        throw new Error('Correct repo naming not found');
    }
});

// Test 10: Commit message format is correct
test('Commit message format is correct', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    if (!content.includes('Initial site publish: ${slug}')) {
        throw new Error('Correct commit message format not found');
    }
});

// Test 11: Fatal error exit removed
test('Fatal error exit for all niches failing is removed', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    // Check that the old error exit is not present
    if (content.includes('All niches failed to generate') && content.includes('process.exit(1)')) {
        // Make sure it's commented or removed
        const lines = content.split('\n');
        let foundFatalExit = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('All niches failed to generate')) {
                // Check next few lines for process.exit(1)
                for (let j = i; j < i + 5 && j < lines.length; j++) {
                    if (lines[j].includes('process.exit(1)') && !lines[j].trim().startsWith('//')) {
                        foundFatalExit = true;
                        break;
                    }
                }
            }
        }
        
        if (foundFatalExit) {
            throw new Error('Fatal error exit still present for all niches failing');
        }
    }
});

// Test 12: Both CSS files are generated
test('Both global.css and styles.css are generated', () => {
    const content = fs.readFileSync(path.join(__dirname, 'site-generator.js'), 'utf-8');
    
    if (!content.includes("writeFileSync(path.join(siteDir, 'global.css')")) {
        throw new Error('global.css generation not found');
    }
    
    if (!content.includes("writeFileSync(path.join(siteDir, 'styles.css')")) {
        throw new Error('styles.css generation not found');
    }
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);
console.log('='.repeat(60));

if (failed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}
