# Testing Guide: Multi-Tier Product Validation System

## Pre-Deployment Testing Checklist

### 1. Syntax and Code Quality ✅
```bash
# Verify all files are syntactically correct
node -c site-generator.js
node -c data-sources.js
node -c api-fallback.js

# Expected: All files should parse without errors
```

### 2. Unit Tests ✅
```bash
# Run validation test suite
node test-validation.js

# Expected output:
# ✅ Null value handling: PASSED
# ✅ Brand tier detection: PASSED
# ✅ Generic blocklist: PASSED
# ✅ Deduplication: PASSED
# ✅ Structured data with nulls: PASSED
```

### 3. Security Scan ✅
```bash
# Run CodeQL security analysis
# Expected: 0 alerts, no vulnerabilities
```

---

## Integration Testing (Staging Environment)

### Test Case 1: Normal Flow (Abundant Products)
```bash
# Test niche with many products available
# Example: wireless-earbuds, bluetooth-headphones

export RAPIDAPI_KEY="your-key-here"
node site-generator.js

# Expected behavior:
# 1. Gathers 50+ products from multiple sources
# 2. Tier A filter: 8-15 premium products
# 3. No Tier B/C needed (TARGET_COUNT met)
# 4. Validates 10 products with full data
# 5. Generates complete site with 10 products
# 6. All products have recognizable brands
# 7. No generic/accessory products

# Verify:
# - Check niche folder created
# - index.html exists and loads properly
# - All 10 products display correctly
# - Affiliate links include tag=scconnec0d-20
# - No console errors in browser
```

### Test Case 2: Moderate Flow (Limited Products)
```bash
# Test niche with fewer premium products
# Example: specific niche like "4k-webcams"

export RAPIDAPI_KEY="your-key-here"
node site-generator.js

# Expected behavior:
# 1. Gathers 20-30 products
# 2. Tier A filter: 3-5 premium products
# 3. Tier B filter: 4-6 reputable products
# 4. TARGET_COUNT (10) met with Tier A+B
# 5. Validates products (some may have null price/rating)
# 6. Generates site with 6-10 products
# 7. Products display "See on Amazon" for missing prices
# 8. Products display "N/A" for missing ratings

# Verify:
# - Products with null price show "See on Amazon"
# - Products with null rating show "N/A ⭐"
# - Structured data omits missing aggregateRating/price
# - Site still functional and professional-looking
```

### Test Case 3: Sparse Flow (Very Few Products)
```bash
# Test very specific or new niche
# Example: niche with <10 quality products available

export RAPIDAPI_KEY="your-key-here"
node site-generator.js

# Expected behavior:
# 1. Gathers 10-15 products
# 2. Tier A filter: 2-3 products
# 3. Tier B filter: 2-3 products
# 4. Tier C filter: 1-2 products
# 5. validatedCount (4) < MIN_ACCEPTABLE (6)
# 6. RapidAPI fallback triggered
# 7. Merges fallback products
# 8. Re-filters and validates
# 9. Final count: 6-8 products
# 10. Generates site with warning if <6

# Verify:
# - RapidAPI fallback logs appear
# - Merge and re-filter happens
# - Site generates with available products
# - No crash or hard failure
# - Log shows graceful degradation warning
```

### Test Case 4: Edge Case (No Valid Products)
```bash
# Test with invalid niche or API issues

export RAPIDAPI_KEY="your-key-here"
node site-generator.js

# Expected behavior:
# 1. Attempts gathering from all sources
# 2. All filters yield 0 products
# 3. RapidAPI fallback returns nothing
# 4. Generates empty-results page
# 5. No crash - graceful handling

# Verify:
# - Empty-results page created
# - Shows "No products available" message
# - CSS and structure still valid
# - No broken links or errors
```

---

## Production Monitoring

### After First Production Run

1. **Check Product Counts:**
   ```bash
   # Count products generated per niche
   for dir in */; do
     if [ -f "$dir/index.html" ]; then
       count=$(grep -o 'class="product-card"' "$dir/index.html" | wc -l)
       echo "$dir: $count products"
     fi
   done
   
   # Expected: Most niches should have 8-10 products
   # Acceptable: Some niches may have 6-7 products
   # Warning: Very few should have <6 products
   ```

2. **Review Skip Reasons:**
   ```bash
   # Check workflow logs for skip reasons
   # Look for patterns:
   # - High duplicate_asin count: Good deduplication working
   # - High generic_term count: Blocklist effective
   # - High missing_asin count: Data source issue
   # - High accessory_pattern count: Good filtering
   ```

3. **Verify Quality:**
   ```bash
   # Randomly sample 5-10 niches
   # For each, check:
   # - All products have recognizable brands ✓
   # - No generic "Wireless Headphones for..." ✓
   # - No accessories like "Cable for..." ✓
   # - No duplicate products (same model, different color) ✓
   # - Affiliate links work and include tag ✓
   ```

4. **Check Graceful Degradation:**
   ```bash
   # Find niches with <6 products
   # Verify:
   # - Site still renders correctly
   # - Shows appropriate content
   # - No broken layouts
   # - Professional appearance maintained
   ```

---

## Rollback Plan

If issues are discovered:

1. **Minor Issues (e.g., brand list needs adjustment):**
   - Update brand lists in `site-generator.js`
   - Commit changes
   - Re-run generator on affected niches

2. **Major Issues (system not working as expected):**
   ```bash
   # Revert to previous version
   git revert HEAD~2  # Revert both commits
   git push
   
   # Re-run generator with previous logic
   node site-generator.js --mode=refresh
   ```

---

## Success Metrics

After 1 week in production:

- ✅ **Product Yield:** 80%+ of niches have 8-10 products
- ✅ **Quality:** 100% of products have recognizable brands
- ✅ **Stability:** 100% of builds succeed (no crashes)
- ✅ **User Experience:** All sites render correctly with/without prices
- ✅ **SEO:** All structured data validates correctly

---

## Contact & Support

For issues or questions:
- Review logs in GitHub Actions workflow
- Check [docs/archive/MULTI_TIER_VALIDATION_SUMMARY.md](docs/archive/MULTI_TIER_VALIDATION_SUMMARY.md) for implementation details
- Examine skip reasons in logs for debugging
- Verify RapidAPI key is set correctly
