# Top-10 Automated Niche Site Generator

🚀 A complete automated niche-site generator that creates SEO-optimized "Top 10" review sites for any product category using real Amazon data.

## 🎯 Overview

This system automatically generates professional, SEO-optimized review websites featuring top 10 products in various niches. Each site is deployed to its own GitHub repository with automatic GitHub Pages hosting.

**Key Features:**
- ✅ SEO-optimized HTML with proper meta tags and structured data
- ✅ Responsive, modern design
- ✅ Individual product review pages
- ✅ Automated blog articles for each product
- ✅ Buyer's guide sections
- ✅ FAQ sections with schema markup
- ✅ Daily updates via GitHub Actions
- ✅ **Each niche gets its own GitHub repository and Pages URL**
- ✅ Automatic deployment pipeline for each site

## 📁 Repository Structure

```
/
├── .github/workflows/
│   └── build-sites.yml          # GitHub Actions workflow
├── templates/
│   ├── template.html            # Main page HTML template
│   ├── template.json            # JSON template configuration
│   ├── product-template.html    # Product card template
│   ├── blog-template.html       # Blog article template
│   └── global.css               # Complete stylesheet
├── niches.csv                   # List of niches to generate
├── site-generator.js            # Main generator script
├── generate-seo.js              # SEO content generator
├── generate-blog.js             # Blog content generator
├── package.json                 # Node.js dependencies
└── sites/                       # Generated sites (auto-created)
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
export RAPIDAPI_HOST="amazon-real-time-api.p.rapidapi.com"
export AMAZON_AFFILIATE_ID="youraffid-20"
```

4. Run the generator:
```bash
node site-generator.js
```

The generator will create sites in the `sites/` directory.

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

For the GitHub Actions workflow to fetch real Amazon data and publish sites to separate repositories, configure these secrets:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `RAPIDAPI_KEY`: Your RapidAPI key for Amazon Real-Time API
   - `RAPIDAPI_HOST`: `amazon-real-time-api.p.rapidapi.com`
   - `AMAZON_AFFILIATE_ID`: Your Amazon Associates affiliate ID
   - `PAT_TOKEN`: Fine-grained Personal Access Token with repo:write access for SC-Connections account (required for auto-publishing to separate repos)

### Workflow Configuration

The workflow runs:
- On push to `main` branch
- On manual trigger (workflow_dispatch)
- Daily at 6 AM UTC (scheduled)

### Multi-Repository Architecture

Each niche site is deployed to its own dedicated GitHub repository:

- **Repository naming**: `top10-<niche-slug>` (e.g., `top10-bluetooth-earbuds`)
- **GitHub Pages URL**: `https://sc-connections.github.io/top10-<niche-slug>/`
- **Automatic workflow**: Each repo includes a `.github/workflows/deploy.yml` file for GitHub Pages deployment
- **Main repo role**: This Top-10 repository serves as the generator and orchestrator, creating and updating all niche site repositories

When the workflow runs:
1. Generates all niche sites locally in the `/sites/` directory
2. For each niche:
   - Creates or updates the repository `top10-<niche-slug>`
   - Pushes the site content (index.html, blog/, global.css)
   - Includes a GitHub Actions workflow for Pages deployment
   - Enables GitHub Pages for the repository

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
2. **Fetch Products**: Calls Amazon API to get top 10 products for each niche
3. **Generate SEO Content**: Creates optimized content using `generate-seo.js`
4. **Generate Blog Articles**: Creates detailed reviews using `generate-blog.js`
5. **Build Pages**: Compiles templates with product data
6. **Auto-Publish** (Optional): If GH_PAT is configured, publishes each site to its own GitHub repository
7. **Deploy**: GitHub Actions publishes to GitHub Pages

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

The workflow automatically:
1. Generates all niche sites
2. (Optional) Publishes each site to its own repository if `GH_PAT` is configured
3. Creates a main index page listing all sites with their respective URLs
4. Deploys the index to the main repository's GitHub Pages
5. Updates daily with fresh Amazon data

### Deployment Options:

**With GH_PAT configured:**
- Each niche site is published to: `https://sc-connections.github.io/<niche-slug>/`
- Main index page at: `https://sc-connections.github.io/Top-10/`

**Without GH_PAT:**
- All sites are deployed under the main repository
- Access sites at: `https://sc-connections.github.io/Top-10/sites/<niche-slug>/`

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

### Mock Data

When API keys are not configured, the generator uses mock data for testing. This allows you to:
- Test the system without API access
- Preview the site structure
- Develop templates and styles

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

- [Amazon Real-Time API](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data)
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

Built with ❤️ for affiliate marketers and content creators
