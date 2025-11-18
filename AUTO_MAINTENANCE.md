# Auto-Site-Maintenance Agent

This document describes the automated site maintenance system that runs daily to improve and update all generated niche sites.

## Overview

The auto-maintenance agent is a comprehensive automation system that applies improvements across three tiers:

1. **Tier 1 - Generator-level fixes**: Core improvements to HTML generation
2. **Tier 2 - Freshness signals**: Keep content up-to-date
3. **Tier 3 - SEO & compliance**: Ensure best practices and accessibility

## Features

### Tier 1 - Generator-Level Fixes

1. **Deduplicate products by ASIN** - Removes duplicate products before rendering HTML
2. **Spell-check with codespell** - Fixes typos in generated HTML files
3. **Uniform star SVGs** - Replaces Unicode stars with 0.1-precision SVG icons
4. **Affiliate tag enforcement** - Ensures all Amazon links include affiliate ID
5. **Specs comparison table** - Generates tables with Price, Rating, Battery, Weight, Driver size (skips rows with missing data)

### Tier 2 - Freshness Signals

6. **Last-updated timestamp** - Inserts/updates `<time id="last-updated">{ISO-date}</time>` in footer
7. **Price overrides** - Reads `data/prices.json` and updates displayed prices
8. **Trending badges** - Adds "Trending ↑" badge when review count increases >5%

### Tier 3 - SEO & Compliance

9. **JSON-LD schema** - Injects Product + AggregateRating schema for every product
10. **Auto-generate meta tags** - Creates title and description if missing:
    - Title: `Top 10 {niche} ({currentYear}) – Updated Daily`
    - Description: `Expert-curated list of the best {niche} for {currentYear}, updated daily with real Amazon data.`
11. **Affiliate disclosure** - Adds fixed footer: `<div class="affiliate-disclosure">As an Amazon Associate I earn from qualifying purchases.</div>`
12. **Accessibility checks** - Runs axe-core on built HTML, fails on critical errors

## Usage

### Manual Execution

```bash
npm run maintenance
```

### Automated Execution

The maintenance agent runs automatically via GitHub Actions:

- **Schedule**: Daily at 6 AM UTC
- **Trigger**: Manual via workflow dispatch
- **Branch**: Creates `copilot-agent/YYYY-MM-DD` branch
- **PR**: Opens single PR titled `chore: auto-dedupe, spell-fix, schema, price-update (copilot-agent)`

## Configuration Files

### data/prices.json

Override prices for specific ASINs per niche:

```json
{
  "bluetooth-headphones": {
    "B0CTBCDD6D": "$39.95",
    "B092CP8ZH4": "$22.95"
  },
  "another-niche": {}
}
```

### data/reviews.json

Track review counts to detect trending products:

```json
{
  "bluetooth-headphones": {
    "B0CTBCDD6D": 8500,
    "B092CP8ZH4": 85000
  },
  "another-niche": {}
}
```

The agent automatically updates this file with current review counts on each run.

## Workflow Rules

1. **Single branch per day**: Creates `copilot-agent/YYYY-MM-DD`
2. **Atomic commits**: Each tier gets its own commit with proper prefix (fix:, feat:, chore:)
3. **Single PR**: All changes consolidated into one pull request
4. **Error handling**: Logs failures but continues with other niches
5. **PR body includes**:
   - Codespell diff
   - Axe accessibility summary
   - List of failed niches (if any)

## Commit Strategy

The workflow makes three atomic commits:

```
fix: apply Tier 1 generator-level fixes
- Deduplicate products by ASIN
- Fix spelling errors with codespell
- Replace star characters with SVG icons
- Ensure affiliate tags on all Amazon links
- Update comparison tables with specs

feat: apply Tier 2 freshness signals
- Update last-updated timestamp to current date (ISO format)
- Apply price overrides from data/prices.json
- Add trending badges for review count increases >5%

feat: apply Tier 3 SEO & compliance fixes
- Ensure meta tags are present (title, description)
- Add affiliate disclosure footer
- Run accessibility checks with axe-core
```

## Dependencies

### Required
- Node.js 18+
- npm packages: `axios`, `dotenv` (already in package.json)

### Optional
- `codespell` - For spell checking (install via pip)
- `@axe-core/puppeteer` - For accessibility checks (install via npm)
- `axe-html-reporter` - For accessibility reporting (install via npm)

## Architecture

### Main Components

1. **auto-maintenance.js** - Main script that orchestrates all maintenance tasks
2. **site-generator.js** - Enhanced with deduplication and specs extraction
3. **.github/workflows/auto-maintenance.yml** - GitHub Actions workflow
4. **data/*.json** - Configuration files for prices and review tracking

### Flow

```
1. Find all niche directories
2. For each niche:
   a. Load index.html
   b. Apply Tier 1 fixes (dedupe, stars, affiliate tags)
   c. Apply Tier 2 updates (timestamp, prices, trending)
   d. Apply Tier 3 enhancements (meta tags, disclosure)
   e. Save changes
   f. Process blog pages
3. Run codespell on all HTML files
4. Run axe-core accessibility checks
5. Generate PR body with results
6. Exit with error if critical accessibility issues found
```

## Error Handling

- **Failed niches**: Logged but don't stop the entire process
- **Missing tools**: Warnings issued but script continues
- **Critical accessibility issues**: Causes workflow to fail
- **No changes**: PR creation skipped if no modifications made

## Output

### PR Body Format

```markdown
# Auto-Site-Maintenance Report

**Date:** 2025-11-18
**Niches Processed:** 5
**Errors:** 0

## 📝 Spelling Corrections

```diff
# bluetooth-headphones
- recieve
+ receive
```

## ♿ Accessibility Summary

- **Critical Issues:** 0
- **Total Issues:** 3

---

**Maintenance Tiers Applied:**
- ✅ Tier 1: Deduplication, spell-check, star SVGs, affiliate tags, comparison tables
- ✅ Tier 2: Timestamps, price updates, trending badges
- ✅ Tier 3: Meta tags, affiliate disclosure, accessibility checks
```

## Limitations

1. **No prose editing**: Only fixes generator output, never modifies user content
2. **Per-niche isolation**: Failed niche doesn't affect others
3. **Existing deploy**: Doesn't push to GitHub Pages directly; relies on existing CI
4. **Main branch only**: Works on default branch, doesn't handle merge conflicts

## Future Enhancements

Potential improvements:

- AI-powered content quality checks
- Image optimization
- Link validation
- Performance monitoring
- SEO score tracking
- Automated A/B testing setup

## Troubleshooting

### Codespell not running
```bash
pip install codespell
```

### Accessibility checks skipped
```bash
npm install @axe-core/puppeteer axe-html-reporter
```

### Workflow fails to create PR
- Check GitHub token permissions (contents: write, pull-requests: write)
- Ensure branch doesn't already exist
- Verify changes were actually made

### Prices not updating
- Check `data/prices.json` format
- Ensure ASIN matches exactly (case-sensitive)
- Verify niche slug matches directory name

## Contributing

To add new maintenance tasks:

1. Add function to `auto-maintenance.js`
2. Call it in the `processNiche()` function
3. Update tier checklist in PR description template
4. Document in this README
5. Test manually with `npm run maintenance`

## License

MIT - Same as parent project
