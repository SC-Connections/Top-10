# Python Multi-Site Static Generator

This directory contains a Python-based multi-site static generator that creates unlimited niche Amazon affiliate sites using RapidAPI.

## Overview

The generator reads niches from `niches.csv`, fetches product data from Amazon via RapidAPI, and generates complete static HTML sites for each niche in the `/sites/<slug>/` directory.

## Files

### 1. niches.csv
CSV file containing niche configurations:
```csv
niche,keyword,node_id
Bluetooth Earbuds,bluetooth earbuds,172541
Sleep Earbuds,sleep earbuds,172541
```

**Columns:**
- `niche`: Display name (e.g., "Bluetooth Earbuds")
- `keyword`: Search keyword for Amazon API
- `node_id`: Amazon node ID (for future use)

### 2. template.html
Clean, SEO-optimized HTML template with placeholders:
- `{{NICHE_TITLE}}` - Niche name
- `{{META_DESCRIPTION}}` - SEO description
- `{{PRODUCTS}}` - Product listing HTML

**Features:**
- Mobile-responsive design
- Modern CSS with gradient headers
- Product card grid layout
- Hover effects and animations

### 3. generator.py
Main Python script that:
- ✅ Reads niches from CSV
- ✅ Slugifies niche names (e.g., "Bluetooth Earbuds" → "bluetooth-earbuds")
- ✅ Calls RapidAPI `/search` endpoint for products
- ✅ Calls RapidAPI `/product` endpoint for detailed info
- ✅ Extracts: title, image, price, original price, discount, ASIN
- ✅ Builds affiliate links: `https://www.amazon.com/dp/<ASIN>?tag=scconnec0d-20`
- ✅ Generates HTML with product blocks
- ✅ Writes to `/sites/<slug>/index.html`

**Error Handling:**
- API call retries (3 attempts with 2s delay)
- Skips products with missing required fields
- Comprehensive logging
- Continues on individual niche failures

### 4. requirements.txt
Python dependencies:
```
requests
python-slugify
```

### 5. .github/workflows/generate-sites.yml
GitHub Actions workflow that:
- ✅ Triggers on push and manual dispatch
- ✅ Uses Python 3.11
- ✅ Installs dependencies from requirements.txt
- ✅ Exports RAPIDAPI_KEY from secrets
- ✅ Runs generator.py
- ✅ Commits generated sites to /sites/
- ✅ Deploys to GitHub Pages

## Usage

### Local Development

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Set API key:**
```bash
export RAPIDAPI_KEY="your-rapidapi-key"
```

3. **Run generator:**
```bash
python generator.py
```

4. **View generated sites:**
```bash
open sites/bluetooth-earbuds/index.html
```

### Adding New Niches

Simply add a new row to `niches.csv`:
```csv
New Niche Name,search keyword,node_id
```

The generator supports 1-500 niches with no code changes.

### GitHub Actions

1. **Configure secrets:**
   - Go to Settings → Secrets → Actions
   - Add `RAPIDAPI_KEY` with your RapidAPI key

2. **Trigger workflow:**
   - Push to main branch
   - Manual trigger via Actions tab

3. **View sites:**
   - Sites deployed to: `https://sc-connections.github.io/Top-10/<slug>/`

## API Details

### RapidAPI Configuration
- **Host:** `amazon-real-time-api.p.rapidapi.com`
- **Endpoints:**
  - `/search` - Search products by keyword
  - `/product` - Get detailed product info by ASIN
- **Headers:**
  - `X-RapidAPI-Key`: Your API key
  - `X-RapidAPI-Host`: amazon-real-time-api.p.rapidapi.com

### Product Search
```python
GET /search
params:
  - q: keyword (e.g., "bluetooth earbuds")
  - domain: "US"
  - limit: 10
```

### Product Details
```python
GET /product
params:
  - asin: Product ASIN
  - domain: "US"
```

## Output Structure

```
/sites/
├── bluetooth-earbuds/
│   └── index.html
├── sleep-earbuds/
│   └── index.html
├── digital-cameras/
│   └── index.html
└── ...
```

Each `index.html` contains:
- Complete HTML document
- Embedded CSS styling
- Product cards with images
- Affiliate links with tag
- Mobile-responsive layout

## Affiliate Links

All Amazon links include the affiliate tag:
```
https://www.amazon.com/dp/<ASIN>?tag=scconnec0d-20
```

This is hardcoded in the generator for consistency.

## Scalability

The system is designed to handle:
- ✅ 1-500 niches with no code changes
- ✅ 10 products per niche
- ✅ Concurrent API calls with rate limiting
- ✅ Error recovery and retry logic
- ✅ Comprehensive logging

## Troubleshooting

### No products found
- Check API key is valid
- Verify keyword returns results on Amazon
- Check API rate limits

### Missing fields error
- Some products may have incomplete data
- Generator skips these automatically
- Check logs for details

### API errors
- Generator retries 3 times automatically
- Check API status at RapidAPI dashboard
- Verify secrets are configured correctly

## Security

- ✅ No vulnerabilities in dependencies
- ✅ API key stored in GitHub Secrets
- ✅ No hardcoded credentials
- ✅ CodeQL security scan passed

## Maintenance

The generator requires minimal maintenance:
- Update `niches.csv` to add/remove niches
- Dependencies are stable and well-maintained
- No database or backend required

---

**Built with Python 3.11+ | Powered by RapidAPI**
