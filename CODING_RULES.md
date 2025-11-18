# Coding Rules for Auto-Generator Site

This document outlines the 10 coding rules implemented for all auto-generated pages in this repository.

## Rule 1: Duplicate Elimination

**Implementation:** `site-generator.js` - `generateProductsHTML()` function

- Before rendering product cards, all products are deduplicated by ASIN
- When duplicates are found, only the product with the highest review count is kept
- Other duplicates are logged and removed
- Prevents identical model names from appearing multiple times on the same page

## Rule 2: Generic-name Skip

**Implementation:** `site-generator.js` - `fetchProducts()` function

- Products with `brand: null` or `brand: ""` from Amazon API are skipped entirely
- No fallback to generic Amazon root node descriptions
- All skipped ASINs are logged to `/logs/skipped-asins.json` with timestamp and reason
- Log includes: ASIN, reason for skipping, timestamp (ISO format)

## Rule 3: Price Freshness Disclaimer

**Implementation:** `site-generator.js` - `generateComparisonTable()` function

- Every comparison table includes a footer disclaimer:
  > "Price shown is the Amazon.com listing as of writing (updated weekly). Click-through for real-time price."
- The "updated weekly" timestamp is managed globally via CI/CD environment variable
- No hard-coded dates in the disclaimer text

## Rule 4: Table-card Data Sync

**Implementation:** `site-generator.js` - `saveProductsData()` function

- All product data (battery, weight, driver size, rating, review count) is pulled once and stored in `/src/data/products.json`
- Both comparison tables and product cards read from this single source of truth
- Missing fields render as "–" instead of blank
- Schema includes: asin, title, brand, image, price, rating, reviews, battery, weight, driver, description, features, pros, cons, url

## Rule 5: Minimum Review Threshold

**Implementation:** `site-generator.js` - `fetchProducts()` function and `generateProductsHTML()`

- Products with < 100 reviews are automatically skipped
- Products with ≥ 100 but < 500 reviews receive a "New entry" badge next to the star row
- Badge is purple colored and appears alongside "Best Overall" or "Best Value" badges
- Configuration constants: `MIN_REVIEW_THRESHOLD = 100`, `NEW_ENTRY_THRESHOLD = 500`

## Rule 6: Accessibility & Semantics

**Implementation:** Multiple files

### Images
- Every `<img>` includes `alt="{Brand} {Model}"` extracted from product data
- Alt text is generated from brand field and short product name
- Template: `product-template.html`, `blog-template.html`

### Star Ratings
- All star-rating elements include `role="img"` and `aria-label`
- Aria-label format: "{rating} out of 5 stars"
- Implementation: `generateStars()` function

### Heading Order
- Main template maintains proper heading hierarchy: h1 → h2 → h3
- Never skips heading levels
- Template: `template.html`

## Rule 7: Mobile Table

**Implementation:** `templates/global.css` and `generateComparisonTable()`

- Comparison tables wrapped in `<div class="table-wrapper" tabindex="0">`
- CSS includes `overflow-x: auto` for horizontal scrolling
- Keyboard accessible with focus outline
- On viewport ≤ 600px, table rows convert to vertical cards via `.table-mobile-card` CSS class
- Mobile view: thead hidden, tbody rows display as blocks, td elements show data labels

## Rule 8: FTC / Amazon Disclosure

**Implementation:** `template.html`

- Disclosure paragraph inserted immediately after the first CTA block on every page
- Text: "We are a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for us to earn fees by linking to Amazon.com and affiliated sites."
- Styled with `class="affiliate-disclosure"` (font-size 0.75rem, muted color, centered)
- Additional disclosure in footer for all pages

## Rule 9: Schema Markup

**Implementation:** `site-generator.js` - `generateStructuredData()` function

- JSON-LD Product + AggregateRating injected for every product that passes review threshold
- Schema includes:
  - Product type, name, brand, image, description
  - AggregateRating with ratingValue, reviewCount, bestRating (5), worstRating (1)
  - Offer with price, priceCurrency (USD), availability, url
- Uses the same data object that feeds the comparison table (single source of truth)
- Guarantees data parity across structured data and visible content

## Rule 10: Logging & CI

**Implementation:** `scripts/validate.py` and `.github/workflows/build-sites.yml`

- Validation script `/scripts/validate.py` runs on every push
- Checks performed:
  1. **Duplicate ASINs**: Scans all generated HTML for duplicate ASINs across pages
  2. **Blank brand fields**: Checks data files and products.json for null/empty brand values
  3. **Missing alt text**: Parses all HTML files to find `<img>` tags without alt attributes
- Script exits with non-zero code on any violation, failing the build early
- Integrated into CI/CD pipeline after site generation, before deployment
- Run locally with: `npm run validate` or `python3 scripts/validate.py`

## Usage

All rules are automatically applied during site generation. To generate sites with these rules:

```bash
# Generate sites (includes all rules)
npm run generate

# Validate generated sites
npm run validate

# Run both (test script)
npm test
```

## Logs and Data

- **Skipped ASINs Log:** `/logs/skipped-asins.json`
- **Products Data:** `/src/data/products.json`
- **Generated Sites:** `/{niche-slug}/index.html` and `/{niche-slug}/blog/*.html`

## CI/CD Integration

The GitHub Actions workflow automatically:
1. Generates sites with all rules applied
2. Runs validation checks
3. Fails the build if validation detects violations
4. Commits and pushes valid generated content

See `.github/workflows/build-sites.yml` for workflow configuration.
