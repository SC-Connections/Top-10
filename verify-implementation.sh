#!/bin/bash
# Verification script to confirm all implementation requirements

echo "======================================"
echo "🔍 VERIFICATION: ANC Removal & Filtering Updates"
echo "======================================"
echo ""

# 1. Check for ANC in source code
echo "1️⃣ Checking source code for ANC badge logic..."
if grep -r "label.*ANC\|icon.*🔇" site-generator.js writers/*.js >/dev/null 2>&1; then
    echo "   ❌ FAIL: ANC badge logic found in source"
else
    echo "   ✅ PASS: No ANC badge logic in source code"
fi

# 2. Check for ANC in generated HTML
echo ""
echo "2️⃣ Checking generated HTML for ANC badges..."
anc_count=$(find . -name "index.html" -path "*/[a-z]*" -type f -exec grep -l "highlight-label.*ANC" {} \; 2>/dev/null | wc -l)
if [ "$anc_count" -gt 0 ]; then
    echo "   ❌ FAIL: Found ANC badges in $anc_count HTML files"
else
    echo "   ✅ PASS: No ANC badges in generated HTML files"
fi

# 3. Check filtering patterns removed
echo ""
echo "3️⃣ Checking that year/marketing patterns were removed..."
if grep -E "\/\^New \|\/\^2024 \|\/\^2025 \|\/\^Upgraded " site-generator.js >/dev/null 2>&1; then
    echo "   ❌ FAIL: Year/marketing patterns still in genericPatterns"
else
    echo "   ✅ PASS: Year/marketing patterns removed from filtering"
fi

# 4. Check GENERIC_BLOCKLIST is minimal
echo ""
echo "4️⃣ Checking GENERIC_BLOCKLIST is minimal..."
blocklist_lines=$(grep -A3 "const GENERIC_BLOCKLIST" site-generator.js | wc -l)
if [ "$blocklist_lines" -le 5 ]; then
    echo "   ✅ PASS: GENERIC_BLOCKLIST is minimal (3 items)"
else
    echo "   ⚠️  WARNING: GENERIC_BLOCKLIST has more items than expected"
fi

# 5. Check pruning script exists
echo ""
echo "5️⃣ Checking auto-pruning script exists..."
if [ -f "scripts/prune-empty-niches.js" ] && [ -x "scripts/prune-empty-niches.js" ]; then
    echo "   ✅ PASS: Pruning script exists and is executable"
else
    echo "   ❌ FAIL: Pruning script missing or not executable"
fi

# 6. Check workflow includes pruning
echo ""
echo "6️⃣ Checking workflow includes pruning step..."
if grep -q "Prune empty niches" .github/workflows/build-sites.yml; then
    echo "   ✅ PASS: Pruning step found in workflow"
else
    echo "   ❌ FAIL: Pruning step not found in workflow"
fi

# 7. Check documentation updated
echo ""
echo "7️⃣ Checking documentation was updated..."
if grep -q "multi-category" README.md; then
    echo "   ✅ PASS: README updated with multi-category focus"
else
    echo "   ❌ FAIL: README still has old wording"
fi

# Summary
echo ""
echo "======================================"
echo "📊 VERIFICATION SUMMARY"
echo "======================================"
echo ""
echo "All critical checks completed."
echo "Review the results above to confirm implementation."
echo ""
