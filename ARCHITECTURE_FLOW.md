# Architecture Flow: Diagnostics & Safe Pruning

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                   │
│                  (.github/workflows/build-sites.yml)         │
│                                                               │
│  Inputs: DEBUG_LOGS=true/false                               │
│  Secrets: RAPIDAPI_KEY, AMAZON_AFFILIATE_ID                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   site-generator.js (main)                   │
│                                                               │
│  1. Validate RAPIDAPI_KEY                                    │
│  2. Load niche-state.json (incremental builds)               │
│  3. Load niche-failures.json (safe pruning)                  │
│  4. For each niche:                                          │
│     ├─ generateSiteForNiche(niche)                           │
│     ├─ Record success/failure                                │
│     └─ Update failure state                                  │
│  5. Save both state files                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              generateSiteForNiche(niche)                     │
│                                                               │
│  1. Print diagnostic header                                  │
│  2. Call fetchProducts(niche) ───────────┐                   │
│  3. Validate product quality             │                   │
│  4. Generate HTML pages                  │                   │
│  5. Return { hasProducts, errorReason }  │                   │
└──────────────────────────────────────────┼──────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────┐
                    │       fetchProducts(niche)               │
                    │                                          │
                    │  1. Call gatherTopProducts(niche) ────┐  │
                    │  2. Apply filters & validation        │  │
                    │  3. Show rejection stats              │  │
                    │  4. Fetch product details from API    │  │
                    │  5. Return validated products         │  │
                    └───────────────────────────────────────┼──┘
                                                            │
                                                            ▼
                              ┌─────────────────────────────────────┐
                              │   gatherTopProducts(niche)          │
                              │   (data-sources.js)                 │
                              │                                     │
                              │  Try all sources in parallel:       │
                              │  ├─ Google Trends (Puppeteer)       │
                              │  ├─ Amazon Best Sellers (Puppeteer) │
                              │  └─ RapidAPI (HTTP)                 │
                              │                                     │
                              │  Print diagnostics:                 │
                              │  ├─ googleTrendsCount: X            │
                              │  ├─ amazonBestSellersCount: Y       │
                              │  ├─ rapidApiCount: Z                │
                              │  └─ Errors for each source          │
                              └──────────┬──────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
    ┌───────────────────────────┐          ┌──────────────────────────────┐
    │   Puppeteer Scrapers      │          │      api-fallback.js         │
    │  (google-trends.js,       │          │                              │
    │   amazon-scraper.js)      │          │  1. Validate API key         │
    │                           │          │     present & length          │
    │  1. Launch browser        │          │  2. Loop through pages 1-5   │
    │  2. Navigate to page      │          │  3. Log each request:        │
    │  3. Check for CAPTCHA     │          │     - URL                    │
    │  4. Extract products      │          │     - Status code            │
    │  5. Return or throw:      │          │     - Error snippet          │
    │     - BLOCKED_CAPTCHA     │          │  4. Aggregate results        │
    │     - TIMEOUT             │          │  5. Return products          │
    │     - SELECTOR_NOT_FOUND  │          │                              │
    │     - Products array      │          └──────────────────────────────┘
    └───────────────────────────┘
```

## Safe Pruning Flow

```
┌─────────────────────────────────────────────────────────────┐
│              prune-empty-niches.js                           │
│                                                               │
│  1. Load niche-failures.json                                 │
│  2. For each niche in niches.csv:                            │
│     ├─ Check if has products                                 │
│     │                                                         │
│     ├─ If HAS PRODUCTS:                                      │
│     │  └─ recordSuccess() → Reset failure count to 0         │
│     │                                                         │
│     └─ If NO PRODUCTS:                                       │
│        ├─ detectErrorReason()                                │
│        ├─ recordFailure()                                    │
│        └─ shouldPruneNiche() ─────────────┐                  │
│                                           │                  │
│  3. Save niche-failures.json              │                  │
│  4. Delete niches that met pruning        │                  │
│     criteria                              │                  │
│  5. Rewrite niches.csv                    │                  │
└───────────────────────────────────────────┼──────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────┐
                     │  shouldPruneNiche(slug, state)           │
                     │  (niche-failure-tracker.js)              │
                     │                                          │
                     │  Check 1: consecutiveEmptyRuns >= 3?    │
                     │  ├─ NO  → Don't prune (1/3 or 2/3)      │
                     │  └─ YES → Continue to Check 2           │
                     │                                          │
                     │  Check 2: Is error transient?           │
                     │  ├─ YES → Don't prune (protected)       │
                     │  │        Transient errors:              │
                     │  │        - blocked                      │
                     │  │        - missing_key                  │
                     │  │        - api_error                    │
                     │  │        - timeout                      │
                     │  │        - blocked_captcha              │
                     │  │        - puppeteer_launch_failed      │
                     │  │                                       │
                     │  └─ NO  → PRUNE (3/3 + permanent)       │
                     │           Permanent errors:              │
                     │           - no_products                  │
                     │           - no_valid_products            │
                     │           - generation_failed            │
                     └──────────────────────────────────────────┘
```

## Error Flow

```
┌────────────────────────────────────────────────────────────┐
│                    Error Scenarios                          │
└────────────────────────────────────────────────────────────┘

Scenario 1: Missing API Key
════════════════════════════
api-fallback.js:
  ├─ Check: RAPIDAPI_KEY present?
  ├─ Result: NO
  ├─ Log: "RAPIDAPI_KEY is missing or empty"
  └─ Throw: Error('RAPIDAPI_KEY is missing or empty')
      │
      ▼
site-generator.js:
  ├─ Catch error
  ├─ Detect: error.message includes 'RAPIDAPI_KEY'
  ├─ Categorize: errorReason = 'missing_key'
  └─ recordFailure(slug, 'missing_key', state)
      │
      ▼
prune-empty-niches.js:
  ├─ shouldPruneNiche(slug, state)
  ├─ consecutiveEmptyRuns = 1, 2, or 3
  ├─ lastErrorReason = 'missing_key'
  ├─ Check: 'missing_key' in transientErrors? YES
  └─ Decision: DON'T PRUNE (protected)


Scenario 2: CAPTCHA Blocked
════════════════════════════
google-trends.js:
  ├─ Navigate to page
  ├─ Check page content
  ├─ Found: "captcha" or "unusual traffic"
  └─ Throw: Error('BLOCKED_CAPTCHA')
      │
      ▼
data-sources.js:
  ├─ Catch error
  ├─ Record: googleTrendsError = 'BLOCKED_CAPTCHA'
  └─ Continue with other sources
      │
      ▼
site-generator.js:
  ├─ If all sources blocked → no products
  ├─ Generate empty results page
  ├─ Detect: errorReason = 'blocked'
  └─ recordFailure(slug, 'blocked', state)
      │
      ▼
prune-empty-niches.js:
  ├─ shouldPruneNiche(slug, state)
  ├─ consecutiveEmptyRuns = 3
  ├─ lastErrorReason = 'blocked'
  ├─ Check: 'blocked' in transientErrors? YES
  └─ Decision: DON'T PRUNE (protected)


Scenario 3: No Products Found (Permanent)
══════════════════════════════════════════
All sources:
  ├─ Google Trends: 0 products
  ├─ Amazon: 0 products
  └─ RapidAPI: 0 products (niche doesn't exist)
      │
      ▼
site-generator.js:
  ├─ fetchProducts() returns []
  ├─ Generate empty results page
  ├─ Detect: errorReason = 'no_products'
  └─ recordFailure(slug, 'no_products', state)
      │
      ▼
prune-empty-niches.js:
  ├─ First run: Protected (1/3)
  ├─ Second run: Protected (2/3)
  └─ Third run:
     ├─ consecutiveEmptyRuns = 3
     ├─ lastErrorReason = 'no_products'
     ├─ Check: 'no_products' in transientErrors? NO
     └─ Decision: PRUNE (3/3 + permanent)
```

## State Management

```
┌────────────────────────────────────────────────────────────┐
│                    State Files                              │
└────────────────────────────────────────────────────────────┘

data/niches-state.json
══════════════════════
Purpose: Track incremental builds
Format:
{
  "niche-slug": {
    "hash": "abc123...",           // Hash of niche definition
    "lastBuild": "2026-01-05T..."  // ISO timestamp
  }
}
Usage: Determines which niches need rebuilding


data/niche-failures.json
════════════════════════
Purpose: Track failures for safe pruning
Format:
{
  "niche-slug": {
    "consecutiveEmptyRuns": 2,              // 0-N
    "lastSuccessTimestamp": "2026-01-01...", // ISO or null
    "lastErrorReason": "blocked",           // Error code
    "lastFailureTimestamp": "2026-01-05..." // ISO
  }
}
Usage: Determines which niches can be safely pruned


State Lifecycle:
════════════════

1. site-generator.js loads both files
2. Generates sites, updates both:
   - niche-state.json: Always updated on success
   - niche-failures.json: Updated on success OR failure
3. prune-empty-niches.js loads niche-failures.json
4. Makes pruning decisions
5. Saves updated niche-failures.json
6. Removes pruned niches from both files
```

## Diagnostic Output Example

```
🚀 Starting niche site generator...
✅ API credentials validated
📡 API Host: amazon-real-time-api.p.rapidapi.com

============================================================
📊 NICHE DIAGNOSTIC: Wireless Earbuds
   Slug: wireless-earbuds
============================================================

🚀 Using intelligent data layer...

🔍 Scraping Google Trends...
  🚀 Launching Puppeteer browser...
  📡 Navigating to: https://trends.google.com/trends/explore?q=...
  ✓ Page loaded successfully
  ✓ Scraped 5 items from Google Trends
✓ Google Trends: 5 products

🔍 Scraping Amazon Best Sellers...
  🚀 Launching Puppeteer browser...
  📡 Navigating to: https://www.amazon.com/s?k=...
  ✓ Page loaded successfully
  ✓ Scraped 8 items from Amazon Best Sellers
✓ Amazon Best Sellers: 8 products

🔑 RAPIDAPI KEY DIAGNOSTIC:
   - API Key present: YES
   - API Key length: 32
   ✅ API Key validated

🔄 RapidAPI: Fetching up to 5 pages with 20 products each...
📄 Fetching page 1/5...
   URL: https://amazon-real-time-api.p.rapidapi.com/search?q=...
   Host: amazon-real-time-api.p.rapidapi.com
   Response Status: 200 OK
✓ Page 1: Got 18 valid products (total: 18)
[... pages 2-5 ...]

📊 DATA SOURCE DIAGNOSTICS:
   Google Trends: 5 products
   Amazon Best Sellers: 8 products
   RapidAPI: 45 products
   Total gathered: 58 products

🔍 Starting strict brand filtering with 58 products...
✓ After strict filtering: 22 branded products
✓ Final selection: 10 products (sorted by quality score)
✓ Premium brands in selection: 7/10

📊 Top skip reasons:
   - no_recognizable_brand: 18
   - duplicate_asin: 12
   - generic_title: 6

📊 Filter Stats:
   - Gathered: 58
   - After validation: 22
   - Premium brands: 7
   - Final selection: 10

📉 Top 3 rejection reasons:
   18x - no_recognizable_brand
   12x - duplicate_asin
   6x - generic_title

✅ Successfully generated site for: Wireless Earbuds
```

## Summary

This architecture provides:

1. **Clear flow** from workflow → generator → sources → pruning
2. **Error handling** at every layer with categorization
3. **State management** for both incremental builds and safe pruning
4. **Comprehensive diagnostics** at each step
5. **Safe pruning** with threshold and transient error protection
