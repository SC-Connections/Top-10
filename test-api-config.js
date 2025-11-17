#!/usr/bin/env node
/**
 * Test script to verify API configuration
 * This validates the setup without making actual API calls
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing API Configuration\n');

// Test 1: Verify site-generator.js configuration
console.log('1️⃣  Testing site-generator.js...');
const siteGenPath = path.join(__dirname, 'site-generator.js');
const siteGenContent = fs.readFileSync(siteGenPath, 'utf-8');

const checks = [
    {
        name: 'API Host hardcoded correctly',
        pattern: /RAPIDAPI_HOST:\s*['"](amazon-real-time-api\.p\.rapidapi\.com)['"]/,
        expected: 'amazon-real-time-api.p.rapidapi.com'
    },
    {
        name: 'Uses /search endpoint',
        pattern: /url:\s*`https:\/\/\$\{CONFIG\.RAPIDAPI_HOST\}\/search`/,
        expected: '/search endpoint'
    },
    {
        name: 'Uses "q" parameter',
        pattern: /q:\s*niche/,
        expected: 'q parameter for query'
    },
    {
        name: 'Uses "country" parameter',
        pattern: /country:\s*['"]US['"]/,
        expected: 'country parameter'
    },
    {
        name: 'Uses "sort_by" parameter',
        pattern: /sort_by:\s*['"]RELEVANCE['"]/,
        expected: 'sort_by parameter'
    },
    {
        name: 'No mock data fallback in fetchProducts',
        pattern: /function fetchProducts\(niche\)[\s\S]*?(?:return generateMockProducts|generateMockProducts\(niche\))/,
        shouldNotExist: true,
        expected: 'No mock data fallback'
    },
    {
        name: 'generateMockProducts function removed',
        pattern: /function generateMockProducts\(/,
        shouldNotExist: true,
        expected: 'Mock products function removed'
    },
    {
        name: 'Saves raw JSON to data directory',
        pattern: /fs\.writeFileSync\(dataFile,\s*JSON\.stringify\(response\.data/,
        expected: 'Saves API response to file'
    },
    {
        name: 'API credentials validation',
        pattern: /if\s*\(!CONFIG\.RAPIDAPI_KEY[\s\S]*?process\.exit\(1\)/,
        expected: 'Validates API key and exits on failure'
    }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
    const match = siteGenContent.match(check.pattern);
    const found = !!match;
    
    if (check.shouldNotExist) {
        if (!found) {
            console.log(`   ✅ ${check.name}`);
            passed++;
        } else {
            console.log(`   ❌ ${check.name} - Found but should not exist`);
            failed++;
        }
    } else {
        if (found) {
            console.log(`   ✅ ${check.name}`);
            passed++;
        } else {
            console.log(`   ❌ ${check.name} - Not found`);
            failed++;
        }
    }
});

console.log('');

// Test 2: Verify .github/scripts/generate-sites.js configuration
console.log('2️⃣  Testing .github/scripts/generate-sites.js...');
const scriptPath = path.join(__dirname, '.github/scripts/generate-sites.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

const scriptChecks = [
    {
        name: 'API Host hardcoded correctly',
        pattern: /RAPIDAPI_HOST\s*=\s*['"](amazon-real-time-api\.p\.rapidapi\.com)['"]/,
        expected: 'amazon-real-time-api.p.rapidapi.com'
    },
    {
        name: 'API credentials validation at startup',
        pattern: /RAPIDAPI_KEY[\s\S]{0,200}?process\.exit\(1\)/,
        expected: 'Validates API key at startup'
    },
    {
        name: 'Uses /search endpoint',
        pattern: /axios\.get\(`https:\/\/\$\{RAPIDAPI_HOST\}\/search`/,
        expected: '/search endpoint'
    },
    {
        name: 'Uses "q" parameter',
        pattern: /q:\s*keyword/,
        expected: 'q parameter for query'
    },
    {
        name: 'Uses "domain" parameter',
        pattern: /domain:\s*AMAZON_DOMAIN/,
        expected: 'domain parameter'
    },
    {
        name: 'No mock data fallback',
        pattern: /generateMockProducts\(/,
        shouldNotExist: true,
        expected: 'No mock data generation'
    },
    {
        name: 'Saves raw JSON to data directory',
        pattern: /fs\.writeFileSync\(dataFile,\s*JSON\.stringify\(response\.data/,
        expected: 'Saves API response to file'
    }
];

scriptChecks.forEach(check => {
    const match = scriptContent.match(check.pattern);
    const found = !!match;
    
    if (check.shouldNotExist) {
        if (!found) {
            console.log(`   ✅ ${check.name}`);
            passed++;
        } else {
            console.log(`   ❌ ${check.name} - Found but should not exist`);
            failed++;
        }
    } else {
        if (found) {
            console.log(`   ✅ ${check.name}`);
            passed++;
        } else {
            console.log(`   ❌ ${check.name} - Not found`);
            failed++;
        }
    }
});

console.log('');

// Test 3: Verify workflow files
console.log('3️⃣  Testing workflow files...');
const workflowFiles = [
    '.github/workflows/generate-sites.yml',
    '.github/workflows/build-sites.yml'
];

workflowFiles.forEach(file => {
    const workflowPath = path.join(__dirname, file);
    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    
    // Should NOT have RAPIDAPI_HOST in env
    if (!workflowContent.match(/RAPIDAPI_HOST:\s*\$\{\{/)) {
        console.log(`   ✅ ${file} - No RAPIDAPI_HOST secret`);
        passed++;
    } else {
        console.log(`   ❌ ${file} - Still references RAPIDAPI_HOST secret`);
        failed++;
    }
});

console.log('');

// Test 4: Verify .gitignore
console.log('4️⃣  Testing .gitignore...');
const gitignorePath = path.join(__dirname, '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

if (gitignoreContent.includes('data/')) {
    console.log('   ✅ data/ directory is gitignored');
    passed++;
} else {
    console.log('   ❌ data/ directory not in .gitignore');
    failed++;
}

console.log('');

// Summary
console.log('='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);
console.log('='.repeat(60));

if (failed > 0) {
    console.log('\n❌ Some tests failed. Please review the configuration.');
    process.exit(1);
} else {
    console.log('\n✅ All configuration tests passed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Configure RAPIDAPI_KEY secret in GitHub');
    console.log('   2. Configure AMAZON_AFFILIATE_ID secret in GitHub');
    console.log('   3. (Optional) Configure PAT_TOKEN for separate repo publishing');
    console.log('   4. Trigger the workflow to test with real API');
    process.exit(0);
}
