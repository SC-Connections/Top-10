# Top-10 Automated Niche Site Generator

🚀 A complete automated niche-site generator that creates SEO-optimized "Top 10" review sites for any product category using real Amazon data.

## 🎯 Overview

This system automatically generates professional, SEO-optimized review websites featuring top 10 products in various niches. All sites are hosted within this repository and served via GitHub Pages.

**Key Features:**
- ✅ **Intelligent multi-source data gathering** (Google Trends, Amazon Best Sellers, RapidAPI fallback)
- ✅ **Premium brand filtering** for higher-quality products
- ✅ SEO-optimized HTML with proper meta tags and structured data
- ✅ Responsive, modern design
- ✅ Individual product review pages
- ✅ Automated blog articles for each product
- ✅ Buyer's guide sections
- ✅ FAQ sections with schema markup
- ✅ Daily updates via GitHub Actions
- ✅ **All niche sites hosted in this repository at `/{slug}/` paths**
- ✅ Automatic deployment pipeline via GitHub Pages

## 📁 Repository Structure

```
/
├── .github/
│   ├── scripts/
│   │   └── generate-sites.js     # Alternative generator script
│   └── workflows/
│       ├── build-sites.yml       # Main workflow (generates sites in repo)
│       ├── generate-sites.yml    # Alternative workflow
│       └── deploy-pages.yml      # GitHub Pages deployment
├── bluetooth-earbuds/            # Generated niche site folders
├── sleep-earbuds/                # (committed to repo)
├── digital-cameras/              # Each at /{slug}/ path
├── templates/
│   ├── template.html            # Main page HTML template
│   ├── template.json            # JSON template configuration
│   ├── product-template.html    # Product card template
│   ├── blog-template.html       # Blog article template
│   └── global.css               # Complete stylesheet
├── data/                        # API response data (gitignored)
├── data-sources.js              # **NEW** Intelligent data layer orchestrator
├── google-trends.js             # **NEW** Google Trends scraper
├── amazon-scraper.js            # **NEW** Amazon Best Sellers scraper
├── api-fallback.js              # **NEW** RapidAPI fallback handler
├── niches.csv                   # List of niches to generate
├── site-generator.js            # Main generator script
├── generate-seo.js              # SEO content generator
├── generate-blog.js             # Blog content generator
└── package.json                 # Node.js dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm
- Puppeteer system dependencies (for scraping): libx11-xcb1, libxtst6, libxcomposite1, libxi6, libxrender1, libxrandr2

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SC-Connections/Top-10.git
cd Top-10
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional for local testing):
```bash
export RAPIDAPI_KEY="your-rapidapi-key"
export AMAZON_AFFILIATE_ID="scconnec0d-20"
```

**Note**: The system now uses an **intelligent multi-source data layer** that gathers products from:
1. **Google Trends** (Puppeteer web scraping) - Shows market demand
2. **Amazon Best Sellers** (Puppeteer web scraping) - Shows proven sales
3. **Premium Brand Filtering** - Filters for high-value brands (Apple, Sony, Bose, Sennheiser, etc.)
4. **RapidAPI Fallback** - Uses Amazon Real-Time API only when fewer than 8 products are found

This ensures sites are generated using real demand data and premium products for higher affiliate commissions.

4. Run the generator:
```bash
node site-generator.js
```

The generator will create sites in individual folders (e.g., `bluetooth-earbuds/`, `sleep-earbuds/`) in the repository root.

## 📝 Adding New Niches

Simply add new product categories to `niches.csv`:

```csv
Bluetooth Earbuds
Sleep Earbuds
Digital Cameras
Gaming Microphones
Student Laptops
Your New Niche Here
```

Each line should be a product category that people search for on Amazon.

## 🔧 Configuration

### GitHub Secrets

For the GitHub Actions workflow to fetch real Amazon data and generate sites, configure these secrets:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `RAPIDAPI_KEY`: Your RapidAPI key for Amazon Real-Time API (https://rapidapi.com/letscrape-6bRBa3QguO5/api/amazon-real-time-api)
   - `AMAZON_AFFILIATE_ID`: Your Amazon Associates affiliate ID

**Note**: The API host is hardcoded to `amazon-real-time-api.p.rapidapi.com` and Amazon domain is set to `US`. These values are not configurable via secrets.

### Workflow Configuration

The workflow runs:
- On push to `main` branch
- On manual trigger (workflow_dispatch)
- Daily at 6 AM UTC (scheduled)

### Repository Architecture

All niche sites are hosted within this single repository:

- **Site paths**: `/{niche-slug}/` (e.g., `/bluetooth-earbuds/`, `/sleep-earbuds/`)
- **GitHub Pages URL**: `https://sc-connections.github.io/Top-10/{niche-slug}/`
- **Automatic deployment**: The `deploy-pages.yml` workflow deploys the entire repository to GitHub Pages
- **Site generation**: The `build-sites.yml` workflow generates sites and commits them back to the main branch

When the workflow runs:
1. Generates all niche sites locally in individual folders (e.g., `/bluetooth-earbuds/`)
2. For each niche:
   - Creates the site content (index.html, blog/, global.css, README.md)
   - Saves it in a folder named after the niche slug
3. Commits and pushes all generated folders back to the main branch
4. GitHub Pages automatically serves them at `https://sc-connections.github.io/Top-10/{slug}/`

## 🎨 Customization

### Templates

All templates are in the `templates/` directory:

- **template.html**: Main page structure
- **template.json**: Template configuration and placeholders
- **product-template.html**: Individual product card layout
- **blog-template.html**: Blog article page structure
- **global.css**: All styles (fully customizable)

### Intelligent Data Layer

The new multi-source data gathering system (`data-sources.js`) orchestrates product discovery:

**Priority Flow:**
1. **Google Trends** (`google-trends.js`) - Identifies trending products via Puppeteer scraping
2. **Amazon Best Sellers** (`amazon-scraper.js`) - Finds best-selling products via Puppeteer scraping
3. **Premium Brand Filter** - Filters products from premium brands:
   - Apple, Sony, Bose, Sennheiser, Bang & Olufsen
   - Shure, Razer, Logitech, Samsung, JBL, Beats
4. **RapidAPI Fallback** (`api-fallback.js`) - Uses Amazon Real-Time API if < 8 premium products

**Benefits:**
- ✅ Real market demand data from Google Trends
- ✅ Proven sellers from Amazon rankings
- ✅ Premium brand focus = higher affiliate commissions
- ✅ Automatic fallback ensures consistent results

### SEO Content

The `generate-seo.js` module handles:
- Introduction paragraphs
- Buyer's guides
- FAQ sections
- Call-to-action text
- Structured data

Customize these functions to match your brand voice.

### Blog Content

The `generate-blog.js` module creates detailed product reviews. Modify the content generation functions to adjust:
- Article length
- Writing style
- Section structure
- Use case recommendations

## 📊 Features

### Intelligent Data Gathering (NEW)

- ✅ **Multi-source product discovery** from Google Trends and Amazon Best Sellers
- ✅ **Web scraping with Puppeteer** for real-time market data
- ✅ **Premium brand filtering** for higher-quality products
- ✅ **Automatic fallback** to RapidAPI when needed
- ✅ **Top 10 best products** from combined sources

### SEO Optimization

- ✅ Proper HTML5 semantic markup
- ✅ Meta descriptions and keywords
- ✅ Open Graph tags for social sharing
- ✅ JSON-LD structured data (Product, ItemList, FAQ schemas)
- ✅ Breadcrumb navigation
- ✅ Mobile-responsive design

### Content Generation

- ✅ Automated intro paragraphs
- ✅ Product comparisons
- ✅ Pros and cons lists
- ✅ Key features extraction
- ✅ Buyer's guide (300-500 words)
- ✅ FAQ section (5 questions)
- ✅ Individual blog articles (300-600 words each)

### Design

- ✅ Modern, clean layout
- ✅ Responsive grid system
- ✅ Professional color scheme
- ✅ Hover effects and animations
- ✅ Mobile-first approach

## 🔄 How It Works

1. **Read Niches**: Reads product categories from `niches.csv`
2. **Validate API Credentials**: Checks that RAPIDAPI_KEY is set (fails if not)
3. **Intelligent Data Gathering** (NEW): Uses multi-source data layer:
   - Scrapes Google Trends for trending products (Puppeteer)
   - Scrapes Amazon Best Sellers for proven products (Puppeteer)
   - Applies premium brand filter (Apple, Sony, Bose, Sennheiser, Bang & Olufsen, etc.)
   - Falls back to RapidAPI if < 8 premium products found
   - Returns top 10 products combined from all sources
4. **Save Raw Data**: Stores gathered products in `/data/<niche>.json` for debugging
5. **Validate Response**: Ensures products have required fields (ASIN, title, image)
6. **Generate SEO Content**: Creates optimized content using `generate-seo.js`
7. **Generate Blog Articles**: Creates detailed reviews using `generate-blog.js`
8. **Build Pages**: Compiles templates with product data
9. **Auto-Publish** (Optional): If PAT_TOKEN is configured, publishes each site to its own GitHub repository
10. **Deploy**: GitHub Actions publishes to GitHub Pages

**Error Handling**: If any niche fails (API error, rate limit, no products), the generator:
- Logs the exact error with full details
- Continues processing other niches
- Fails the entire build if ALL niches fail
- Never generates mock or dummy data

## 🚀 Auto-Publishing Feature

When configured with a GitHub Personal Access Token (`GH_PAT`), the generator automatically:

1. **Creates a separate GitHub repository** for each niche site at `https://github.com/SC-Connections/<niche-slug>`
2. **Pushes all site content** to the new repository
3. **Enables GitHub Pages** automatically on the `main` branch
4. **Outputs the public URL** at `https://sc-connections.github.io/<niche-slug>/`

### Benefits:
- ✅ Each niche site has its own dedicated repository
- ✅ Independent version control for each site
- ✅ Separate GitHub Pages URLs for better SEO
- ✅ Easier to manage individual sites
- ✅ Falls back gracefully if token is not configured

### Setup:
Add a fine-grained Personal Access Token with `repo:write` permissions to the `GH_PAT` secret in GitHub Actions settings.

## 🌐 Generated Site Structure

Each niche site includes:

```
/sites/bluetooth-earbuds/
├── index.html           # Main top 10 list page
├── global.css          # Styles
└── blog/
    ├── ASIN1.html      # Product 1 detailed review
    ├── ASIN2.html      # Product 2 detailed review
    └── ...             # Reviews for all 10 products
```

## 📈 GitHub Pages Deployment

The deployment process uses two GitHub Actions workflows:

### 1. Build and Deploy Niche Sites (`build-sites.yml`)
This workflow:
1. Generates all niche sites from `niches.csv`
2. Creates niche folders in the repository root (e.g., `/bluetooth-headphones/`)
3. Commits and pushes the generated folders to the repository
4. Runs on push to main, workflow dispatch, or weekly schedule

### 2. Deploy to GitHub Pages (`deploy-pages.yml`)
This workflow:
1. Runs AFTER the build workflow completes successfully
2. Validates that all niche folders exist before deployment
3. Generates the root index.html page
4. Uploads and deploys all content to GitHub Pages
5. Can also be manually triggered via workflow dispatch

**Important**: The deploy workflow will FAIL if niche folders are missing. This prevents deploying broken sites with 404 errors.

### Site URLs:
- Main index: `https://sc-connections.github.io/Top-10/`
- Niche sites: `https://sc-connections.github.io/Top-10/<niche-slug>/`
  - Example: `https://sc-connections.github.io/Top-10/bluetooth-headphones/`

### First-Time Setup:
1. Ensure `RAPIDAPI_KEY` secret is configured in repository settings
2. Add at least one niche to `niches.csv`
3. Manually trigger the "Build and Deploy Niche Sites" workflow
4. Wait for it to complete and commit niche folders
5. The deploy workflow will automatically run and deploy to GitHub Pages

## 🛠️ Development

### Running Locally

```bash
# Install dependencies
npm install

# Generate sites
node site-generator.js

# Sites will be in the sites/ directory
# Open sites/[niche-slug]/index.html in a browser
```

### Important: No Mock Data

**The generator requires valid API credentials and real API data to function.** There is no mock data fallback. If:
- RAPIDAPI_KEY is not configured
- API returns an error or invalid response
- Products are missing required fields (ASIN, title, image, price, rating, reviews, description)

The generator will **fail immediately** and will NOT generate any sites. This ensures that only real, complete product data from Amazon is used in generated sites.

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional template designs
- More niche-specific content generators
- Enhanced SEO features
- Better product data extraction
- Internationalization

## 📄 License

MIT License - feel free to use this for your own projects!

## 🔗 Resources

- [Amazon Real-Time API on RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/amazon-real-time-api)
- [API Documentation](https://rapidapi.com/letscrape-6bRBa3QguO5/api/amazon-real-time-api/details)
- [Amazon Associates Program](https://affiliate-program.amazon.com/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Schema.org Product Documentation](https://schema.org/Product)

## 💡 Tips

1. **Choose Good Niches**: Select product categories with high search volume
2. **Update Regularly**: The daily cron job keeps data fresh
3. **Monitor Performance**: Check which niches perform best
4. **Customize Content**: Tailor the SEO content to your target audience
5. **Test Locally**: Always test changes locally before deploying

## 📞 Support

For issues or questions, please open a GitHub issue.

---

## 🎧 Premium Bluetooth Headphone Scraper

### Overview

The repository now includes a specialized premium Bluetooth headphone scraper (`scraper/top10Premium.js`) that focuses exclusively on high-end audio products. This scraper implements strict filtering, deduplication, and categorical organization.

### Features

#### 1. **Premium Brand Whitelist**
Only products from these premium brands are included:
- Sony, Bose, Sennheiser
- Apple/AirPods
- Bang & Olufsen, Bowers & Wilkins
- Master & Dynamic, Focal
- AKG, Shure
- Beats (Studio and Pro lines only)

#### 2. **Quality Filters**
- **Minimum Price**: $150 USD (MSRP or list price)
- **Keyword Blacklist**: Rejects products containing "kids", "gaming", "cheap", "budget"
- **TWS Exception**: "TWS" keyword is rejected unless from a premium brand (Sony, Bose, Sennheiser, Apple)

#### 3. **Model Deduplication**
Products are deduplicated by normalized model name:
- Removes color variants: black, white, navy, blue, red, green, silver, gold, etc.
- Removes size indicators: xl, large, small, medium, xs, xxl
- Removes edition markers: limited, edition, midnight, space, rose
- Only the highest-ranked variant of each model is retained

Example:
- "Sony WH-1000XM5 Black" → normalized to "sony wh-1000xm5"
- "Sony WH-1000XM5 Silver" → same normalized title, deduplicated

#### 4. **Car Category Mapping**
Each of the 10 final products is mapped to a unique car category:
1. sedan
2. suv
3. hatchback
4. convertible
5. coupe
6. pickup
7. minivan
8. wagon
9. ev
10. luxury

This ensures exactly 10 products with unique categories in the output.

#### 5. **Data Sources**
Products are gathered from multiple sources in priority order:

1. **Google Trends RSS** - Identifies trending Bluetooth headphone queries
2. **Amazon Best Sellers** - Puppeteer scrapes Electronics › Headphones › Over-Ear category
   - Filters by brand whitelist during scraping
3. **RapidAPI Fallback** - Used only if fewer than 10 premium unique models found
   - Endpoint: `amazon-real-time-api`

#### 6. **Output Schema**
Products are saved to `/data/top10_premium_headphones.json` with this structure:

```json
{
  "category": "sedan",
  "rank": 1,
  "brand": "Sony",
  "model": "WH-1000XM5",
  "normalizedTitle": "sony wh-1000xm5",
  "asin": "B09XS7JWHH",
  "price": 399,
  "image": "https://...",
  "amazonUrl": "https://www.amazon.com/dp/B09XS7JWHH",
  "trendScore": 95
}
```

### Usage

#### Running the Scraper

```bash
# Set environment variable (optional for RapidAPI fallback)
export RAPIDAPI_KEY="your-key-here"

# Run the scraper
node scraper/top10Premium.js
```

Output will be saved to `/data/top10_premium_headphones.json`.

#### Running Tests

```bash
# Run premium filter tests
node test/premiumFilter.test.js
```

The test suite validates:
- ✅ Unique `normalizedTitle` per product
- ✅ All prices ≥ $150
- ✅ Exactly 10 unique categories from the predefined list
- ✅ All required fields present
- ✅ Premium brand filtering logic
- ✅ Keyword blacklist logic
- ✅ Title normalization and deduplication

### Example Output

See `/examples/top10_premium_headphones.json` for a complete sample output showing all 10 categories with premium headphones.

### Architecture

```
/scraper/
  └── top10Premium.js       # Main premium scraper
/test/
  └── premiumFilter.test.js # Unit tests
/data/
  └── top10_premium_headphones.json  # Output (generated)
/examples/
  └── top10_premium_headphones.json  # Sample output
```

### Implementation Details

**Trend Score Calculation**: Products receive scores from 100 down to 50 based on their ranking position. Earlier products (higher rank) receive higher trend scores.

**Brand Extraction**: The scraper intelligently extracts brand names from product titles and maps them to the premium brand list.

**Model Extraction**: Model names are derived by removing the brand name from the full product title.

**Fallback Logic**: If Puppeteer scraping returns fewer than 10 premium products after filtering, the RapidAPI fallback is automatically triggered to supplement the results.

---

Built with ❤️ for affiliate marketers and content creators
