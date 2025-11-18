# Automation Features Guide

## Overview

The Top-10 generator now includes powerful automation features for scraping, ranking, and content generation. This guide explains how to use each feature.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `puppeteer` - Web scraping
- `openai` - AI content generation
- Other required dependencies

Note: Chrome download is skipped. GitHub Actions uses system Chrome.

### 2. Set Environment Variables

```bash
# Required for RapidAPI fallback
export RAPIDAPI_KEY="your-rapidapi-key-here"

# Optional - for AI content generation
export OPENAI_API_KEY="your-openai-api-key-here"

# Required for affiliate links
export AMAZON_AFFILIATE_ID="your-amazon-tag"
```

## Feature Usage

### Auto-Fix Validation

**Purpose**: Automatically fix common data issues to prevent CI failures.

**Fixes:**
- Blank brand → "Unknown"
- Missing description → Generated from features
- Missing price → "Check Amazon"

**Usage:**
```bash
# Run standalone
node scripts/auto-fix-validation.js

# Automatically runs in CI pipeline
# Also integrated into site-generator.js
```

**Example Output:**
```
🔧 Running auto-fix validation...

📝 Checking bluetooth-headphones.json...
⚠️ Auto-fixing blank brand for ASIN B01234567
✅ Auto-fixed and saved bluetooth-headphones.json

============================================================
📊 AUTO-FIX SUMMARY
============================================================
✅ Files processed: 3
🔧 Files fixed: 1
============================================================
```

### Amazon Scraping with Puppeteer

**Purpose**: Scrape Amazon product data directly using Puppeteer with RapidAPI fallback.

**Usage:**
```bash
# Scrape a niche (default 20 products)
node scripts/scrape-amazon.js "bluetooth headphones"

# Specify max products
node scripts/scrape-amazon.js "bluetooth headphones" 30
```

**Output:**
- Saves to: `data/{niche-slug}-puppeteer.json`
- Contains: ASIN, title, image, price, rating, reviews, brand, features, description

**Example Output:**
```
🚀 Amazon Scraper (Puppeteer)

📦 Niche: bluetooth headphones
🔢 Max Products: 20

🔍 Scraping Amazon Best Sellers for: bluetooth headphones
📡 Navigating to: https://www.amazon.com/s?k=bluetooth+headphones...
✅ Scraped 20 products from Amazon
💾 Saved to: data/bluetooth-headphones-puppeteer.json

✅ Scraping complete!
📊 Total products: 20
```

**Fallback**: Automatically uses RapidAPI if Puppeteer fails.

### Google Trends Integration

**Purpose**: Fetch trending search terms to enhance product rankings.

**Usage:**
```bash
# Scrape trends for a niche
node scripts/scrape-google-trends.js "bluetooth headphones"
```

**Output:**
- Saves to: `data/{niche-slug}-trends.json`
- Contains: Query, trend value, trend score, rank

**Example Output:**
```
📈 Google Trends Scraper

📦 Niche: bluetooth headphones

📈 Scraping Google Trends for: bluetooth headphones
📡 Navigating to: https://trends.google.com/trends/explore...
✅ Found 10 trending queries
💾 Saved trends to: data/bluetooth-headphones-trends.json

📈 Top 5 Trends:
  1. best wireless headphones (+100%)
  2. sony headphones (+85%)
  3. noise cancelling headphones (+70%)
  4. budget bluetooth headphones (+60%)
  5. apple airpods (+50%)
```

### Merge Amazon + Google Trends

**Purpose**: Combine rankings using weighted scoring for optimal results.

**Scoring Formula:**
```
amazonScore = ((totalProducts - rank + 1) / totalProducts) * 100
trendsScore = matchPercentage * trendScore
compositeScore = (amazonScore * 0.6) + (trendsScore * 0.4)
```

**Usage:**
```bash
# Must run scrapers first
node scripts/scrape-amazon.js "bluetooth headphones"
node scripts/scrape-google-trends.js "bluetooth headphones"

# Then merge
node scripts/merge-rankings.js "bluetooth headphones"
```

**Output:**
- Saves to: `data/{niche-slug}-merged.json`
- Products ranked by composite score

**Example Output:**
```
🔄 Merge Rankings Script

📦 Niche: bluetooth headphones
⚖️  Scoring: Amazon (60%) + Trends (40%)

🔗 Merging Amazon + Google Trends data...
📦 Amazon products: 20
📈 Trend queries: 10
✅ Rankings merged successfully

📊 Top 5 Products (by composite score):
  1. Sony WH-1000XM5
     Amazon: 100.0 | Trends: 85.0 | Composite: 94.0
     Trend Match: "sony headphones"
  2. Apple AirPods Pro
     Amazon: 95.0 | Trends: 50.0 | Composite: 77.0
     Trend Match: "apple airpods"
  ...

⭐ High Priority Items (both Amazon + Trends): 6
```

### AI Content Generation

**Purpose**: Generate natural, human-like product reviews and blog content.

**Requirements:**
- OpenAI API key (optional - uses templates if not available)
- Set `OPENAI_API_KEY` environment variable

**Usage:**
```bash
# Generate content for a niche
export OPENAI_API_KEY="sk-..."
node scripts/generate-reviews.js "bluetooth headphones"
```

**Output:**
- Saves to: `data/{niche-slug}-content.json`
- Contains: Blog intro, product reviews, conclusion

**Example Output:**
```
✍️  AI Review Generator

📦 Niche: bluetooth headphones
🤖 AI Mode: Enabled (OpenAI)

📂 Loaded 10 products from: bluetooth-headphones-merged.json

✍️  Generating content...

✅ Generated blog intro
✅ Generated review 1/10
✅ Generated review 2/10
...
✅ Generated conclusion

💾 Saved generated content to: data/bluetooth-headphones-content.json

✅ Content generation complete!
📝 Generated 10 product reviews
```

**Without OpenAI API Key:**
- Automatically falls back to template-based generation
- Still produces quality content
- No API costs

## Complete Workflow

Here's how to use all features together:

```bash
#!/bin/bash
# Complete automation workflow

NICHE="bluetooth headphones"

echo "Step 1: Scrape Amazon"
node scripts/scrape-amazon.js "$NICHE"

echo "Step 2: Scrape Google Trends"
node scripts/scrape-google-trends.js "$NICHE"

echo "Step 3: Merge Rankings"
node scripts/merge-rankings.js "$NICHE"

echo "Step 4: Generate AI Content"
node scripts/generate-reviews.js "$NICHE"

echo "Step 5: Auto-fix any issues"
node scripts/auto-fix-validation.js

echo "Step 6: Generate site"
node site-generator.js

echo "✅ Complete! Site generated with optimized rankings and AI content"
```

## CI/CD Integration

All features are automatically integrated into the GitHub Actions workflow:

```yaml
- name: Install Puppeteer dependencies
  run: sudo apt-get install -y libnss3 libatk-bridge2.0-0 ...

- name: Auto-fix validation (pre-generation)
  run: node scripts/auto-fix-validation.js

- name: Generate niche sites
  env:
    RAPIDAPI_KEY: ${{ secrets.RAPIDAPI_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: node site-generator.js

- name: Auto-fix validation (post-generation)
  run: node scripts/auto-fix-validation.js
```

## Troubleshooting

### Puppeteer fails to launch

**Solution**: Install system dependencies:
```bash
sudo apt-get update
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1
```

### "Cannot find module 'puppeteer'"

**Solution**: Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### "OPENAI_API_KEY not set"

**Effect**: Falls back to template-based generation (no action needed)

**To use AI**: Set environment variable:
```bash
export OPENAI_API_KEY="sk-your-key-here"
```

### Auto-fix not working

**Check**:
1. Data files exist in `data/` directory
2. Files are valid JSON
3. Run with: `node scripts/auto-fix-validation.js`

### Scraping returns no results

**Check**:
1. Network connectivity
2. Amazon/Google Trends not blocking requests
3. RapidAPI key is valid (for fallback)
4. Niche name is valid

## Best Practices

1. **Always run auto-fix** before validation to prevent CI failures
2. **Use merged rankings** for better product selection
3. **Enable AI content** for more natural reviews (optional)
4. **Set rate limits** to avoid being blocked by Amazon/Google
5. **Cache results** to reduce API calls

## Support

For issues or questions:
1. Check the main README.md
2. Review error messages carefully
3. Test individual scripts in isolation
4. Open an issue on GitHub

## Advanced Configuration

### Custom Scoring Weights

Edit `scripts/merge-rankings.js`:
```javascript
const CONFIG = {
    AMAZON_WEIGHT: 0.6,  // Change to adjust Amazon influence
    TRENDS_WEIGHT: 0.4   // Change to adjust Trends influence
};
```

### Custom AI Prompts

Edit `scripts/generate-reviews.js`:
```javascript
const prompt = `Your custom prompt here...`;
```

### Puppeteer Options

Edit `scripts/scrape-amazon.js`:
```javascript
const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--custom-arg']
});
```

---

**Last Updated**: November 2024
**Version**: 2.0.0
