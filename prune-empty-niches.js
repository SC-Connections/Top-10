/**
 * Prune Empty Niches
 * Automatically removes niches with zero valid products from niches.csv
 * and deletes associated data and generated folders
 * 
 * SAFE PRUNING: Only prunes after consecutive failures with non-transient errors
 */

const fs = require('fs');
const path = require('path');
const { 
    loadFailureState, 
    saveFailureState, 
    recordSuccess, 
    recordFailure, 
    shouldPruneNiche,
    detectErrorReason,
    CONSECUTIVE_FAILURE_THRESHOLD 
} = require('./niche-failure-tracker');

const NICHES_FILE = path.join(__dirname, 'niches.csv');
const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_DIR = __dirname;

/**
 * Create URL-friendly slug from niche name
 */
function createSlug(niche) {
    return niche
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Check if a niche has products by checking its generated index.html
 */
function nicheHasProducts(slug) {
    const indexPath = path.join(OUTPUT_DIR, slug, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
        console.log(`  ⚠️  No index.html found for ${slug}`);
        return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    // Check for "No Results Available" or "No products" in title or content
    if (content.includes('No Results Available') || 
        content.includes('No products available') ||
        content.includes('no products with complete information')) {
        return false;
    }
    
    // Check for actual product structured data
    if (!content.includes('"@type": "Product"') && !content.includes('"@type": "ItemList"')) {
        return false;
    }
    
    // If there's product structured data, it has products
    return content.includes('"@type": "Product"');
}

/**
 * Delete niche folder and data
 */
function deleteNicheFiles(slug) {
    const nicheFolder = path.join(OUTPUT_DIR, slug);
    const dataFile = path.join(DATA_DIR, `${slug}.json`);
    
    let deletedItems = [];
    
    // Delete niche folder recursively
    if (fs.existsSync(nicheFolder)) {
        fs.rmSync(nicheFolder, { recursive: true, force: true });
        deletedItems.push(`folder: ${slug}/`);
    }
    
    // Delete data file
    if (fs.existsSync(dataFile)) {
        fs.unlinkSync(dataFile);
        deletedItems.push(`data: ${slug}.json`);
    }
    
    return deletedItems;
}

/**
 * Main pruning function with safe failure tracking
 */
async function pruneEmptyNiches() {
    console.log('🧹 Starting safe niche pruning process...\n');
    console.log(`⚙️  Configuration: Consecutive failure threshold = ${CONSECUTIVE_FAILURE_THRESHOLD}\n`);
    
    // Read niches.csv
    if (!fs.existsSync(NICHES_FILE)) {
        console.error('❌ ERROR: niches.csv not found');
        process.exit(1);
    }
    
    const nichesContent = fs.readFileSync(NICHES_FILE, 'utf-8');
    const allNiches = nichesContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
    
    console.log(`📋 Total niches in CSV: ${allNiches.length}`);
    
    // Load failure tracking state
    const failureState = loadFailureState();
    
    const validNiches = [];
    const emptyNiches = [];
    const protectedNiches = []; // Niches that failed but shouldn't be pruned yet
    
    // Check each niche
    for (const niche of allNiches) {
        const slug = createSlug(niche);
        console.log(`\n🔍 Checking: ${niche} (${slug})`);
        
        const hasProducts = nicheHasProducts(slug);
        
        if (hasProducts) {
            console.log(`  ✅ Has products - keeping`);
            validNiches.push(niche);
            // Record success to reset failure count
            recordSuccess(slug, failureState);
        } else {
            console.log(`  ⚠️  No products detected`);
            
            // Detect error reason
            const errorReason = detectErrorReason(slug, hasProducts);
            console.log(`  📊 Error reason: ${errorReason}`);
            
            // Record failure
            recordFailure(slug, errorReason, failureState);
            
            // Check if should prune
            const pruneDecision = shouldPruneNiche(slug, failureState);
            console.log(`  📝 Failure count: ${pruneDecision.failureCount}`);
            console.log(`  📝 Prune decision: ${pruneDecision.shouldPrune ? 'YES' : 'NO'}`);
            console.log(`  📝 Reason: ${pruneDecision.reason}`);
            
            if (pruneDecision.shouldPrune) {
                console.log(`  ❌ Marking for removal (${pruneDecision.reason})`);
                emptyNiches.push({ niche, slug, reason: pruneDecision.reason });
            } else {
                console.log(`  🛡️  Protected from pruning (${pruneDecision.reason})`);
                protectedNiches.push({ niche, slug, reason: pruneDecision.reason });
                validNiches.push(niche); // Keep in CSV
            }
        }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Valid niches (with products): ${validNiches.length - protectedNiches.length}`);
    console.log(`  - Protected niches (failures below threshold): ${protectedNiches.length}`);
    console.log(`  - Niches to prune: ${emptyNiches.length}`);
    
    // Save failure state
    saveFailureState(failureState);
    
    // If no changes needed
    if (emptyNiches.length === 0) {
        console.log('\n✅ No niches meet pruning criteria. Nothing to prune.');
        
        if (protectedNiches.length > 0) {
            console.log('\n🛡️  Protected niches (not yet pruned):');
            protectedNiches.forEach(({ niche, reason }) => {
                console.log(`  - ${niche}: ${reason}`);
            });
        }
        
        return {
            changed: false,
            validCount: validNiches.length,
            removedCount: 0,
            protectedCount: protectedNiches.length
        };
    }
    
    // Delete files for empty niches that meet pruning criteria
    console.log(`\n🗑️  Deleting files for niches that meet pruning criteria...`);
    const deletedFiles = [];
    
    for (const { niche, slug, reason } of emptyNiches) {
        console.log(`\n  Removing: ${niche} (${slug})`);
        console.log(`  Reason: ${reason}`);
        const deleted = deleteNicheFiles(slug);
        deleted.forEach(item => console.log(`    ✓ Deleted ${item}`));
        deletedFiles.push(...deleted);
        
        // Remove from failure state since we're pruning it
        delete failureState[slug];
    }
    
    // Save updated failure state
    saveFailureState(failureState);
    
    // Rewrite niches.csv with only valid niches
    console.log(`\n📝 Rewriting niches.csv with ${validNiches.length} niches...`);
    
    // Create numbered list format
    const newContent = validNiches
        .map((niche, index) => `${index + 1}. ${niche}`)
        .join('\n') + '\n';
    
    fs.writeFileSync(NICHES_FILE, newContent);
    console.log('  ✓ niches.csv updated');
    
    console.log(`\n✅ Pruning complete!`);
    console.log(`  - Kept: ${validNiches.length} niches`);
    console.log(`  - Protected: ${protectedNiches.length} niches`);
    console.log(`  - Removed: ${emptyNiches.length} niches`);
    console.log(`  - Deleted: ${deletedFiles.length} files/folders`);
    
    if (protectedNiches.length > 0) {
        console.log(`\n🛡️  Protected niches (not yet pruned):`);
        protectedNiches.forEach(({ niche, reason }) => {
            console.log(`  - ${niche}: ${reason}`);
        });
    }
    
    if (emptyNiches.length > 0) {
        console.log(`\n📋 Removed niches:`);
        emptyNiches.forEach(({ niche, reason }) => {
            console.log(`  - ${niche}: ${reason}`);
        });
    }
    
    return {
        changed: true,
        validCount: validNiches.length,
        removedCount: emptyNiches.length,
        protectedCount: protectedNiches.length,
        removedNiches: emptyNiches.map(e => e.niche)
    };
}

// Run if called directly
if (require.main === module) {
    pruneEmptyNiches()
        .then(result => {
            if (result.changed) {
                process.exit(0); // Exit 0 indicates changes were made
            } else {
                process.exit(1); // Exit 1 indicates no changes
            }
        })
        .catch(error => {
            console.error('❌ ERROR during pruning:', error);
            process.exit(2); // Exit 2 indicates error
        });
}

module.exports = { pruneEmptyNiches };
