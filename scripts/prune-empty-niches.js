#!/usr/bin/env node
/**
 * Auto-Pruning Script for Empty Niches
 * 
 * This script:
 * 1. Loads each niche from niches.csv
 * 2. Checks if the niche has valid products after filtering
 * 3. Removes niches with zero products from niches.csv
 * 4. Deletes data files and generated site folders for removed niches
 * 5. Returns exit code 0 if changes were made, 1 if no changes
 */

const fs = require('fs');
const path = require('path');
const { gatherTopProducts } = require('../data-sources');

// Configuration
const NICHES_FILE = path.join(__dirname, '..', 'niches.csv');
const DATA_DIR = path.join(__dirname, '..', 'data');
const ROOT_DIR = path.join(__dirname, '..');

/**
 * Read niches from CSV file
 * @returns {string[]} Array of niche names
 */
function readNiches() {
    if (!fs.existsSync(NICHES_FILE)) {
        console.error('❌ niches.csv not found');
        process.exit(1);
    }
    
    const content = fs.readFileSync(NICHES_FILE, 'utf-8');
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map((line, index) => line.replace(/^\d+\.\s*/, '').trim()) // Remove number prefix if present
        .filter(niche => niche.length > 0);
}

/**
 * Convert niche name to URL-safe slug
 * @param {string} niche - Niche name
 * @returns {string} URL slug
 */
function nicheToSlug(niche) {
    return niche
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Check if niche has valid products
 * @param {string} niche - Niche name
 * @returns {Promise<boolean>} True if niche has products
 */
async function nicheHasProducts(niche) {
    try {
        console.log(`  Checking: ${niche}...`);
        
        // Use the same product gathering logic as the main generator
        const result = await gatherTopProducts(niche);
        
        if (!result || !result.products) {
            console.log(`    ❌ No products returned`);
            return false;
        }
        
        const productCount = result.products.length;
        console.log(`    ✓ Found ${productCount} products`);
        
        return productCount > 0;
    } catch (error) {
        console.log(`    ❌ Error gathering products: ${error.message}`);
        return false;
    }
}

/**
 * Delete niche folder recursively
 * @param {string} dirPath - Directory path to delete
 */
function deleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`    🗑️  Deleted directory: ${dirPath}`);
    }
}

/**
 * Delete niche data file
 * @param {string} slug - Niche slug
 */
function deleteDataFile(slug) {
    const dataFile = path.join(DATA_DIR, `${slug}.json`);
    if (fs.existsSync(dataFile)) {
        fs.unlinkSync(dataFile);
        console.log(`    🗑️  Deleted data file: ${dataFile}`);
    }
}

/**
 * Main pruning function
 */
async function pruneEmptyNiches() {
    console.log('🌿 Starting auto-pruning of empty niches...\n');
    
    const allNiches = readNiches();
    console.log(`📋 Found ${allNiches.length} niches in niches.csv\n`);
    
    const validNiches = [];
    const removedNiches = [];
    
    // Check each niche
    for (const niche of allNiches) {
        const hasProducts = await nicheHasProducts(niche);
        
        if (hasProducts) {
            validNiches.push(niche);
        } else {
            removedNiches.push(niche);
            const slug = nicheToSlug(niche);
            
            console.log(`  ❌ Marking for removal: ${niche} (slug: ${slug})`);
            
            // Delete data file
            deleteDataFile(slug);
            
            // Delete generated site folder
            const nicheDir = path.join(ROOT_DIR, slug);
            deleteDirectory(nicheDir);
        }
    }
    
    console.log(`\n📊 Pruning Summary:`);
    console.log(`   Valid niches: ${validNiches.length}`);
    console.log(`   Removed niches: ${removedNiches.length}`);
    
    if (removedNiches.length > 0) {
        console.log(`\n🗑️  Removed niches:`);
        removedNiches.forEach(niche => console.log(`   - ${niche}`));
        
        // Rewrite niches.csv with only valid niches
        const newContent = validNiches
            .map((niche, index) => `${index + 1}. ${niche}`)
            .join('\n') + '\n';
        
        fs.writeFileSync(NICHES_FILE, newContent, 'utf-8');
        console.log(`\n✅ Updated niches.csv with ${validNiches.length} valid niches`);
        
        // Exit with code 0 to indicate changes were made
        process.exit(0);
    } else {
        console.log('\n✅ No empty niches found. All niches have products!');
        
        // Exit with code 1 to indicate no changes
        process.exit(1);
    }
}

// Run the pruning
pruneEmptyNiches().catch(error => {
    console.error('❌ Fatal error during pruning:', error);
    process.exit(1);
});
