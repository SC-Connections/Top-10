# Top-10 Automated Niche Site Generator

🚀 A complete automated niche-site generator that creates SEO-optimized "Top 10" review sites for any product category using real Amazon data.

## 🎯 Overview

This system automatically generates professional, SEO-optimized review websites featuring top 10 products in various niches. Each site includes:

- ✅ SEO-optimized HTML with proper meta tags and structured data
- ✅ Responsive, modern design
- ✅ Individual product review pages
- ✅ Automated blog articles for each product
- ✅ Buyer's guide sections
- ✅ FAQ sections with schema markup
- ✅ Daily updates via GitHub Actions
- ✅ Automatic deployment to GitHub Pages

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
export RAPIDAPI_HOST="real-time-amazon-data.p.rapidapi.com"
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

For the GitHub Actions workflow to fetch real Amazon data, configure these secrets:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `RAPIDAPI_KEY`: Your RapidAPI key for Amazon Real-Time API
   - `RAPIDAPI_HOST`: `real-time-amazon-data.p.rapidapi.com`
   - `AMAZON_AFFILIATE_ID`: Your Amazon Associates affiliate ID

### Workflow Configuration

The workflow runs:
- On push to `main` branch
- On manual trigger (workflow_dispatch)
- Daily at 6 AM UTC (scheduled)

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
6. **Deploy**: GitHub Actions publishes to GitHub Pages

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
2. Creates a main index page listing all sites
3. Deploys to GitHub Pages
4. Updates daily with fresh Amazon data

Access your sites at: `https://[username].github.io/Top-10/`

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