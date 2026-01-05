# Debugging and Safe Pruning Guide

## Overview

This guide explains the new diagnostic and safe pruning features added to prevent data loss and make troubleshooting easier.

## Diagnostics Features

### 1. Source-by-Source Product Counts

When generating sites, you'll now see detailed diagnostics showing how many products came from each data source:

```
📊 DATA SOURCE DIAGNOSTICS:
   Google Trends: 5 products
   Amazon Best Sellers: 8 products
   RapidAPI: 20 products
   Total gathered: 33 products
```

If a source fails, you'll see the error:

```
📊 DATA SOURCE DIAGNOSTICS:
   Google Trends: 0 products (Error: BLOCKED_CAPTCHA)
   Amazon Best Sellers: 0 products (Error: TIMEOUT)
   RapidAPI: 15 products
   Total gathered: 15 products
```

### 2. API Key Diagnostics

The system now validates API keys before making requests:

```
🔑 RAPIDAPI KEY DIAGNOSTIC:
   - API Key present: YES
   - API Key length: 32
   ✅ API Key validated
```

If the key is missing:

```
🔑 RAPIDAPI KEY DIAGNOSTIC:
   - API Key present: NO
   - API Key length: 0
   ❌ RAPIDAPI_KEY is missing or empty!
   ❌ This will cause all RapidAPI requests to fail
   ❌ Set RAPIDAPI_KEY environment variable or GitHub secret
```

### 3. HTTP Request Diagnostics

For each RapidAPI request, you'll see:

```
📄 Fetching page 1/5...
   URL: https://amazon-real-time-api.p.rapidapi.com/search?q=...
   Host: amazon-real-time-api.p.rapidapi.com
   Response Status: 200 OK
```

If requests fail:

```
📄 Fetching page 1/5...
   Response Status: 401 Unauthorized
   Error snippet: {"message":"Invalid API key"}
⚠️  Stopping pagination due to error response
```

### 4. Puppeteer Error Detection

Scraper failures are now clearly categorized:

- **BLOCKED_CAPTCHA**: Page shows CAPTCHA or "unusual traffic"
- **TIMEOUT**: Navigation took too long (>30 seconds)
- **SELECTOR_NOT_FOUND**: Page structure changed
- **PUPPETEER_LAUNCH_FAILED**: Browser failed to start

### 5. Validation Rejection Tracking

See why products are being rejected:

```
📊 Filter Stats:
   - Gathered: 50
   - After validation: 18
   - Premium brands: 12
   - Final selection: 10

📉 Top 3 rejection reasons:
   15x - no_recognizable_brand
   8x - duplicate_asin
   5x - generic_title
```

### 6. Per-Niche Diagnostic Headers

Each niche shows a clear diagnostic header:

```
============================================================
📊 NICHE DIAGNOSTIC: Wireless Earbuds
   Slug: wireless-earbuds
============================================================
```

## Safe Pruning System

### How It Works

The new safe pruning system protects against data loss from transient failures:

1. **Tracks consecutive failures** for each niche
2. **Only prunes after 3 consecutive failures** (configurable threshold)
3. **Protects transient errors**: blocked, missing_key, api_error, timeout
4. **Only prunes permanent failures**: no_products, no_valid_products

### Failure State File

State is stored in `data/niche-failures.json`:

```json
{
  "wireless-earbuds": {
    "consecutiveEmptyRuns": 2,
    "lastSuccessTimestamp": "2026-01-01T10:00:00.000Z",
    "lastErrorReason": "blocked",
    "lastFailureTimestamp": "2026-01-05T10:00:00.000Z"
  }
}
```

### Error Reason Codes

**Transient Errors (NOT pruned):**
- `blocked` - CAPTCHA or IP blocking detected
- `missing_key` - RAPIDAPI_KEY not set
- `api_error` - API returned error response
- `blocked_captcha` - CAPTCHA detected in scraper
- `timeout` - Request or navigation timeout
- `puppeteer_launch_failed` - Browser failed to launch

**Permanent Errors (pruned after threshold):**
- `no_products` - No products found from any source
- `no_valid_products` - Products found but all rejected by validation
- `generation_failed` - Site generation crashed

### Pruning Workflow

**First Failure:**
```
🔍 Checking: Wireless Earbuds (wireless-earbuds)
  ⚠️  No products detected
  📊 Error reason: blocked
  📝 Failure count: 1
  📝 Prune decision: NO
  📝 Reason: Only 1 consecutive failures (threshold: 3)
  🛡️  Protected from pruning
```

**Third Failure (Transient Error):**
```
🔍 Checking: Wireless Earbuds (wireless-earbuds)
  ⚠️  No products detected
  📊 Error reason: blocked
  📝 Failure count: 3
  📝 Prune decision: NO
  📝 Reason: Transient error: blocked (not pruning)
  🛡️  Protected from pruning
```

**Third Failure (Permanent Error):**
```
🔍 Checking: Wireless Earbuds (wireless-earbuds)
  ⚠️  No products detected
  📊 Error reason: no_products
  📝 Failure count: 3
  📝 Prune decision: YES
  📝 Reason: 3 consecutive failures with error: no_products
  ❌ Marking for removal
```

### Workflow Integration

The GitHub Actions workflow now shows safe pruning status:

```yaml
- name: Prune empty niches (safe mode)
  run: |
    echo "🧹 Safe pruning: Only removes niches after 3 consecutive failures..."
    echo "📊 Protects against transient errors (blocked, missing_key, api_error, timeout)"
```

## Debug Mode

Enable detailed logging in manual workflow runs:

1. Go to Actions tab
2. Select "Build and Deploy Niche Sites" workflow
3. Click "Run workflow"
4. Set "Enable debug logging" to "true"
5. Run workflow

This sets the `DEBUG_LOGS=true` environment variable.

## Workflow Configuration Check

The workflow now logs configuration before running:

```
📊 Configuration:
   - RAPIDAPI_KEY present: true
   - AMAZON_AFFILIATE_ID present: true
   - DEBUG_LOGS: false
```

## Troubleshooting Guide

### Issue: "0 valid products" repeatedly

**Check:**
1. Look at source diagnostics - are any sources working?
2. Check API key diagnostic - is RAPIDAPI_KEY set?
3. Check rejection reasons - why are products being filtered out?
4. Check Puppeteer errors - are scrapers blocked?

**Common Causes:**
- Missing or invalid RAPIDAPI_KEY
- All sources blocked by CAPTCHA (use SKIP_PUPPETEER=true)
- Overly strict brand filtering (expected - only premium brands)
- API field mapping changed (check product structure in logs)

### Issue: Niches deleted after first failure

**Fixed!** The safe pruning system now requires 3 consecutive failures before pruning.

### Issue: Can't tell why products are rejected

**Fixed!** Check the validation rejection tracking for top 3 reasons with counts.

### Issue: API failures not visible

**Fixed!** Check the HTTP request diagnostics for status codes and error snippets.

## Configuration

### Change Failure Threshold

Edit `niche-failure-tracker.js`:

```javascript
const CONSECUTIVE_FAILURE_THRESHOLD = 3; // Change to 5 for more tolerance
```

### Add New Transient Error Type

Edit `niche-failure-tracker.js` in `shouldPruneNiche()`:

```javascript
const transientErrors = [
  'blocked', 
  'missing_key', 
  'api_error', 
  'blocked_captcha', 
  'timeout', 
  'puppeteer_launch_failed',
  'your_new_error_type' // Add here
];
```

### Disable Safe Pruning (Not Recommended)

To revert to immediate pruning, set threshold to 1:

```javascript
const CONSECUTIVE_FAILURE_THRESHOLD = 1;
```

## Testing

### Test Missing API Key

```bash
unset RAPIDAPI_KEY
node site-generator.js --mode=incremental
```

Expected: Clear error message, niche protected from pruning.

### Test Pruning Threshold

```bash
# First run - should protect
node prune-empty-niches.js

# Second run - should still protect
node prune-empty-niches.js

# Third run - should prune if permanent error
node prune-empty-niches.js
```

### Test Diagnostics

```bash
# With valid API key
export RAPIDAPI_KEY="your-key-here"
node site-generator.js --mode=incremental
```

Look for:
- Source-by-source counts
- API key validation
- HTTP request logs
- Validation rejection reasons

## Summary

The new diagnostic and safe pruning system provides:

✅ **Clear visibility** into data source status
✅ **API key validation** before requests
✅ **Detailed error categorization** for troubleshooting
✅ **Protection against transient failures** 
✅ **Threshold-based pruning** to prevent data loss
✅ **Debug mode** for detailed investigation

This makes the generator more robust, easier to debug, and safer to run in production.
