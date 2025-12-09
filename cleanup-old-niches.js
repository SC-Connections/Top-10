#!/usr/bin/env node
/**
 * Cleanup Old Niche Site Folders
 * Deletes site folders that are not in the current niches.csv
 */

const fs = require('fs');
const path = require('path');

// Configuration
const NICHES_FILE = path.join(__dirname, 'niches.csv');
const ROOT_DIR = __dirname;

// System/utility folders to exclude from deletion
const EXCLUDE_FOLDERS = [
    'node_modules',
    'data',
    'templates',
    'template',
    'scripts',
    'scraper',
    'writers',
    'examples',
    'generated-pages',
    'test',
    'tablets',
    'assets',
    '.git',
    '.github',
];

/**
 * Read valid niches from CSV file
 * @returns {Set<string>} Set of valid niche slugs
 */
function readValidNiches() {
    const content = fs.readFileSync(NICHES_FILE, 'utf-8');
    const niches = content
        .split('\n')
        .map(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '')) // Remove numbering
        .filter(line => line.length > 0);
    
    return new Set(niches);
}

/**
 * Get all directories in root
 * @returns {string[]} Array of directory names
 */
function getAllDirectories() {
    return fs.readdirSync(ROOT_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
}

/**
 * Check if a directory is a system/utility folder
 * @param {string} dirName - Directory name
 * @returns {boolean} True if it's a system folder
 */
function isSystemFolder(dirName) {
    return EXCLUDE_FOLDERS.includes(dirName);
}

/**
 * Main cleanup function
 */
function cleanup() {
    console.log('🧹 Starting cleanup of old niche site folders...\n');
    
    // Read valid niches
    const validNiches = readValidNiches();
    console.log(`✅ Found ${validNiches.size} valid niches in niches.csv\n`);
    
    // Get all directories
    const allDirs = getAllDirectories();
    console.log(`📁 Found ${allDirs.length} total directories in repository\n`);
    
    // Identify folders to delete
    const foldersToDelete = [];
    for (const dir of allDirs) {
        // Skip system folders
        if (isSystemFolder(dir)) {
            continue;
        }
        
        // Skip if in valid niches
        if (validNiches.has(dir)) {
            continue;
        }
        
        // This folder should be deleted
        foldersToDelete.push(dir);
    }
    
    console.log(`🗑️  Found ${foldersToDelete.length} folders to delete:\n`);
    foldersToDelete.forEach((folder, index) => {
        console.log(`   ${index + 1}. ${folder}`);
    });
    console.log();
    
    // Delete folders
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const folder of foldersToDelete) {
        const folderPath = path.join(ROOT_DIR, folder);
        try {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log(`✓ Deleted: ${folder}`);
            deletedCount++;
        } catch (error) {
            console.error(`✗ Error deleting ${folder}:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Cleanup Summary:`);
    console.log(`   ✅ Successfully deleted: ${deletedCount} folders`);
    if (errorCount > 0) {
        console.log(`   ❌ Errors: ${errorCount} folders`);
    }
    console.log(`   📁 Remaining valid niches: ${validNiches.size}`);
    console.log('='.repeat(60));
    console.log('\n✅ Cleanup completed!\n');
}

// Run cleanup
try {
    cleanup();
} catch (error) {
    console.error('❌ Fatal error during cleanup:', error.message);
    process.exit(1);
}
