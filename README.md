# Top-10 Automated Niche Site Generator

🚀 A complete automated niche-site generator that creates SEO-optimized "Top 10" review sites for any product category using real Amazon data.

## 🎯 Overview

This system automatically generates professional, SEO-optimized review websites featuring top 10 products in various niches. All sites are hosted within this repository under the `sites/` directory and served via GitHub Pages.

**Key Features:**
- ✅ SEO-optimized HTML with proper meta tags and structured data
- ✅ Responsive, modern design with comparison tables
- ✅ Individual product review pages
- ✅ Automated blog articles for each product
- ✅ Buyer's guide sections
- ✅ FAQ sections with schema markup
- ✅ Weekly updates via GitHub Actions
- ✅ **All niche sites hosted in `sites/<slug>/` paths**
- ✅ Automatic deployment pipeline via GitHub Pages
- ✅ Clean product names without long specs
- ✅ 0-review products automatically filtered out

## 📁 Repository Structure

```
/
├── .github/
│   ├── scripts/
│   │   └── generate-sites.js     # Alternative generator script
│   └── workflows/
│       ├── build-sites.yml       # Main workflow (generates sites weekly)
│       ├── generate-sites.yml    # Alternative workflow
│       └── deploy-pages.yml      # GitHub Pages deployment
├── sites/                        # Generated niche sites directory
│   ├── index.html               # Main listing of all niches
│   ├── bluetooth-headphones/    # Example niche site
│   ├── sleep-earbuds/           # Each at sites/<slug>/ path
│   └── ...
├── templates/
│   ├── template.html            # Main page HTML template
│   ├── template.json            # JSON template configuration
│   ├── product-template.html    # Product card template
│   ├── blog-template.html       # Blog article template
│   └── global.css               # Complete stylesheet
├── data/                        # API response data (gitignored)
├── niches.csv                   # List of niches to generate
├── index.html                   # Root redirect to sites/
├── site-generator.js            # Main generator script
├── generate-seo.js              # SEO content generator
├── generate-blog.js             # Blog content generator
└── package.json                 # Node.js dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm

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

**Note**: The system uses the correct Amazon Real-Time API endpoint (`https://amazon-real-time-api.p.rapidapi.com/search`) with proper parameters (`q` for query and `domain` for Amazon domain). Mock data fallback has been removed - the generator will fail if API credentials are invalid or API returns an error.

4. Run the generator:
```bash
node site-generator.js
```

The generator will create sites in individual folders under `sites/` (e.g., `sites/bluetooth-earbuds/`, `sites/sleep-earbuds/`).

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
- Weekly on Monday at 6 AM UTC (scheduled)

### Repository Architecture

All niche sites are hosted within this single repository under the `sites/` directory:

- **Site paths**: `sites/<niche-slug>/` (e.g., `sites/bluetooth-earbuds/`, `sites/sleep-earbuds/`)
- **Main listing**: `sites/index.html` lists all available niches
- **GitHub Pages URL**: `https://sc-connections.github.io/Top-10/sites/<niche-slug>/`
- **Automatic deployment**: The `deploy-pages.yml` workflow deploys the entire repository to GitHub Pages
- **Site generation**: The `build-sites.yml` workflow generates sites weekly and commits them back to the main branch

When the workflow runs:
1. Generates all niche sites locally in `sites/<niche-slug>/` folders
2. For each niche:
   - Creates the site content (index.html, blog/, global.css, README.md)
   - Saves it in a folder named after the niche slug under `sites/`
3. Creates `sites/index.html` listing all niches
4. Creates root `index.html` that redirects to `sites/`
5. Commits and pushes all generated content back to the main branch
6. GitHub Pages automatically serves them at `https://sc-connections.github.io/Top-10/sites/<slug>/`

## 🎨 Customization

### Templates

All templates are in the `templates/` directory:

- **template.html**: Main page structure
- **template.json**: Template configuration and placeholders
- **product-template.html**: Individual product card layout
- **blog-template.html**: Blog article page structure
- **global.css**: All styles (fully customizable)

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

### SEO Optimization

- ✅ Proper HTML5 semantic markup
- ✅ Meta descriptions and keywords
- ✅ Open Graph tags for social sharing
- ✅ JSON-LD structured data (Product, ItemList, FAQ schemas)
- ✅ Breadcrumb navigation
- ✅ Mobile-responsive design

### Content Generation

- ✅ Automated intro paragraphs
- ✅ Product comparisons with comparison table
- ✅ Clean product names without long specs
- ✅ Key features extraction
- ✅ Buyer's guide (300-500 words)
- ✅ FAQ section (5 questions)
- ✅ Individual blog articles (300-600 words each)
- ✅ Products with 0 reviews automatically filtered out

### Design

- ✅ Modern, clean layout
- ✅ Responsive grid system
- ✅ Professional color scheme
- ✅ Hover effects and animations
- ✅ Mobile-first approach

## 🔄 How It Works

1. **Read Niches**: Reads product categories from `niches.csv`
2. **Validate API Credentials**: Checks that RAPIDAPI_KEY is set (fails if not)
3. **Fetch Products**: Calls Amazon Real-Time API `/search` endpoint with correct parameters (`q` and `domain`)
4. **Save Raw Data**: Stores complete API response in `/data/<niche>.json` for debugging
5. **Validate Response**: Ensures products have required fields (ASIN, title, image)
6. **Filter Products**: Removes products with 0 reviews or 0 rating
7. **Clean Product Names**: Extracts short titles without specs/descriptions
8. **Generate SEO Content**: Creates optimized content using `generate-seo.js`
9. **Generate Blog Articles**: Creates detailed reviews using `generate-blog.js`
10. **Build Pages**: Compiles templates with product data and comparison table
11. **Create Index Pages**: Generates `sites/index.html` and root `index.html`
12. **Deploy**: GitHub Actions publishes to GitHub Pages

**Error Handling**: If any niche fails (API error, rate limit, no products), the generator:
- Logs the exact error with full details
- Continues processing other niches
- Fails the entire build if ALL niches fail
- Never generates mock or dummy data

## 🌐 Generated Site Structure

Each niche site includes:

```
sites/<niche-slug>/
├── index.html           # Main top 10 list page with comparison table
├── global.css          # Styles
├── styles.css          # (copy of global.css for compatibility)
└── blog/
    ├── ASIN1.html      # Product 1 detailed review
    ├── ASIN2.html      # Product 2 detailed review
    └── ...             # Reviews for all 10 products
```

## 📈 GitHub Pages Deployment

The workflow automatically:
1. Generates all niche sites under `sites/`
2. Creates a main index page at `sites/index.html` listing all sites
3. Creates a root `index.html` that redirects to `sites/`
4. Commits all changes to the main branch
5. Deploys the entire repository to GitHub Pages
6. Updates weekly with fresh Amazon data

### Main URLs:
- **Homepage**: `https://sc-connections.github.io/Top-10/` (redirects to `/sites/`)
- **Sites Listing**: `https://sc-connections.github.io/Top-10/sites/`
- **Individual Niches**: `https://sc-connections.github.io/Top-10/sites/<niche-slug>/`

## 🛠️ Development

### Running Locally

```bash
# Install dependencies
npm install

# Generate sites
node site-generator.js

# Sites will be in the sites/ directory
# Open sites/index.html or sites/[niche-slug]/index.html in a browser
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
2. **Update Regularly**: The weekly cron job keeps data fresh
3. **Monitor Performance**: Check which niches perform best
4. **Customize Content**: Tailor the SEO content to your target audience
5. **Test Locally**: Always test changes locally before deploying
6. **Use Relative Paths**: All internal links use relative paths for portability

## 📞 Support

For issues or questions, please open a GitHub issue.

---

Built with ❤️ for affiliate marketers and content creators
