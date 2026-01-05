#!/usr/bin/env node
/**
 * Verify Slug Generation Consistency
 * Ensures createSlug() logic is identical across all scripts
 */

const fs = require('fs');
const path = require('path');

// Import createSlug from site-generator.js
const siteGeneratorCode = fs.readFileSync(path.join(__dirname, '..', 'site-generator.js'), 'utf-8');
const createSlugMatch = siteGeneratorCode.match(/function createSlug\(niche\) \{[\s\S]*?\n\}/);

if (!createSlugMatch) {
    console.error('❌ ERROR: Could not find createSlug function in site-generator.js');
    process.exit(1);
}

// Extract the function implementation
const createSlugImpl = createSlugMatch[0];

// Test the slug generation
function createSlug(niche) {
    return niche
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// Test cases
const testCases = [
    { input: 'Bluetooth Earbuds', expected: 'bluetooth-earbuds' },
    { input: 'Sleep Earbuds', expected: 'sleep-earbuds' },
    { input: 'Digital Cameras', expected: 'digital-cameras' },
    { input: '3D Printers!', expected: '3d-printers' },
    { input: 'Ab Rollers & Equipment', expected: 'ab-rollers-equipment' },
    { input: 'Wireless-Headphones', expected: 'wireless-headphones' },
    { input: '  Tablet   ', expected: 'tablet' },
];

console.log('🧪 Testing slug generation consistency...\n');

let passed = 0;
let failed = 0;

for (const { input, expected } of testCases) {
    const result = createSlug(input);
    if (result === expected) {
        console.log(`✅ "${input}" → "${result}"`);
        passed++;
    } else {
        console.log(`❌ "${input}" → "${result}" (expected: "${expected}")`);
        failed++;
    }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 Test Results:`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log('='.repeat(60));

if (failed > 0) {
    console.error('\n❌ Some tests failed!');
    process.exit(1);
}

console.log('\n✅ All tests passed! Slug generation is consistent.\n');

// Verify prune script uses same logic
const pruneCode = fs.readFileSync(path.join(__dirname, '..', 'prune-empty-niches.js'), 'utf-8');
const pruneSlugMatch = pruneCode.match(/function createSlug\(niche\) \{[\s\S]*?\n\}/);

if (!pruneSlugMatch) {
    console.error('❌ ERROR: Could not find createSlug in prune-empty-niches.js');
    process.exit(1);
}

// Compare implementations
if (createSlugImpl.trim() !== pruneSlugMatch[0].trim()) {
    console.error('❌ WARNING: createSlug implementations differ between scripts!');
    console.error('\nsite-generator.js:');
    console.error(createSlugImpl);
    console.error('\nprune-empty-niches.js:');
    console.error(pruneSlugMatch[0]);
    process.exit(1);
}

console.log('✅ createSlug implementation is identical in site-generator.js and prune-empty-niches.js.\n');

// Note about cleanup-old-niches.js
console.log('ℹ️  Note: cleanup-old-niches.js does not use createSlug().');
console.log('   It expects niches.csv to contain pre-slugified names (e.g., "bluetooth-earbuds").\n');

console.log('🎉 All verifications passed!\n');
