# Top-10 Niche Site Generator

Automated generator for creating "Top 10" review sites for multiple niches using GitHub Actions, RapidAPI, and static HTML.

## 🎯 Overview

This repository automatically generates complete Top 10 review sites for any niche listed in `niches.csv`. Each site features:

- 📊 Comparison tables with product rankings
- 🎨 Responsive dark theme design
- 📝 Detailed product reviews with pros/cons
- 📖 Buyer's guide sections
- ❓ FAQ with schema markup for SEO
- 🔗 Amazon affiliate links

## 🚀 Features

- **Automated Generation**: GitHub Actions workflow generates sites for each niche
- **Amazon Integration**: Fetches real products via RapidAPI (with fallback mock data)
- **Responsive Design**: Mobile-first dark theme matching reference template
- **SEO Optimized**: Structured data, meta tags, and semantic HTML
- **Zero Dependencies**: Pure HTML/CSS output, no build step needed
- **GitHub Pages Ready**: Automatically deploys to GitHub Pages

## 📁 Project Structure

```
Top-10/
├── .github/
│   ├── workflows/
│   │   └── generate-sites.yml       # GitHub Actions workflow
│   └── scripts/
│       └── generate-sites.js        # Main generation script
├── _layouts/
│   └── top10.html                   # HTML template with placeholders
├── assets/
│   └── css/
│       └── review.css               # Stylesheet (dark theme)
├── sites/                           # Generated sites (created by workflow)
│   ├── bluetooth-earbuds/
│   ├── digital-cameras/
│   └── ...
├── niches.csv                       # List of niches to generate
├── package.json                     # Node.js dependencies
├── index.html                       # Main index (auto-generated)
└── README.md                        # This file
```

## 🔧 Setup

### Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. **RAPIDAPI_KEY**: Your RapidAPI API key (optional - uses mock data if not provided)
2. **RAPIDAPI_HOST**: Your RapidAPI host endpoint (optional)
3. **AMAZON_AFFILIATE_ID**: Your Amazon Associate tag (optional)

### Enable GitHub Pages

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` (or your default branch)
4. Folder: `/ (root)`
5. Save

## 📝 Configuration

### Adding Niches

Edit `niches.csv` to add or modify niches:

```csv
keyword,nodeId,year,numProducts
Bluetooth Earbuds,172282,2025,10
Digital Cameras,502394,2025,10
Gaming Microphones,11091801,2025,10
Student Laptops,565108,2025,10
Sleep Earbuds,172282,2025,10
```

- **keyword**: Search term for products (e.g., "Bluetooth Earbuds")
- **nodeId**: Amazon category node ID (optional, for API filtering)
- **year**: Year for the review (e.g., 2025)
- **numProducts**: Number of products to include (default: 10)

## 🏃 Usage

### Automatic Trigger

The workflow runs automatically when:
- You push changes to `niches.csv`
- You push changes to workflow or script files
- You manually trigger via Actions tab

### Manual Trigger

1. Go to the **Actions** tab
2. Select **Generate Niche Sites**
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## 📦 Output

For each niche, the script generates:

```
sites/{slug}/
├── index.html           # Complete review site
├── assets/
│   └── css/
│       └── review.css   # Stylesheet
└── README.md            # Site-specific readme
```

The main `index.html` is also updated with links to all generated sites.

## 🎨 Design Features

Based on the SC-Connections bluetooth-earbuds template:

- **Dark Theme**: `#0d0f12` background with `#5aa9ff` accent
- **Sticky Header**: With navigation links
- **Hero Section**: Title, description, last updated date
- **Comparison Table**: Rank, product name, tagline, image, buy link
- **Review Cards**: 2-column grid with image, description, pros/cons
- **Buyer's Guide**: Step-by-step purchasing advice
- **FAQ Section**: Common questions with schema markup
- **Footer**: Affiliate disclosure and trust information

## 🔍 API Integration

### With RapidAPI (Recommended)

The script fetches real product data from RapidAPI's Amazon API:

```javascript
// Set these environment variables/secrets
RAPIDAPI_KEY=your_api_key
RAPIDAPI_HOST=amazon-real-time-api.p.rapidapi.com
AMAZON_AFFILIATE_ID=your_tag
```

### Without API (Mock Data)

If API credentials aren't provided, the script generates:
- Realistic product titles
- Placeholder images
- Randomized prices and ratings
- Generic descriptions and pros/cons

Perfect for testing and development!

## 🧪 Local Development

### Install Dependencies

```bash
npm install
```

### Generate Sites Locally

```bash
# With API credentials (optional)
export RAPIDAPI_KEY="your_key"
export RAPIDAPI_HOST="your_host"
export AMAZON_AFFILIATE_ID="your_tag"

# Run generator
node .github/scripts/generate-sites.js

# View output
ls -la sites/
```

### Test Generated Sites

```bash
# Open in browser
open sites/bluetooth-earbuds/index.html

# Or use a local server
npx http-server sites/bluetooth-earbuds
```

## 📋 Example Niches

The default `niches.csv` includes:

1. **Bluetooth Earbuds** - Wireless audio devices
2. **Digital Cameras** - Photography equipment
3. **Gaming Microphones** - Streaming/gaming audio
4. **Student Laptops** - Portable computers for students
5. **Sleep Earbuds** - Comfortable earbuds for sleeping

Feel free to add any niche that has products on Amazon!

## 🔐 Security

- **No Secrets in Code**: All API keys are stored as GitHub Secrets
- **No API Keys Logged**: Keys are never printed to console
- **Affiliate Disclosure**: Every page includes proper disclosure
- **NoFollow Links**: All Amazon links use `rel="nofollow sponsored"`

## 🚨 Troubleshooting

### Sites Not Generating

- Check that `niches.csv` is properly formatted
- Verify workflow is enabled in Actions tab
- Check Actions logs for errors

### API Errors

- Verify RAPIDAPI_KEY and RAPIDAPI_HOST are correct
- Check RapidAPI dashboard for rate limits
- Script will fall back to mock data automatically

### GitHub Pages Not Deploying

- Wait 1-2 minutes after push for build
- Check Settings → Pages for build status
- Ensure `main` branch has content in root

### Empty Product Data

- API might have returned no results for that keyword
- Try different keywords or node IDs
- Mock data will be used as fallback

## 🤝 Contributing

1. Fork the repository
2. Add your niches to `niches.csv`
3. Customize templates in `_layouts/` and `assets/css/`
4. Test locally with `node .github/scripts/generate-sites.js`
5. Submit a pull request

## 📄 License

MIT License - Feel free to use and modify for your projects.

## 🙏 Credits

- Design based on SC-Connections/bluetooth-earbuds template
- Built for automated niche site generation
- Powered by GitHub Actions and RapidAPI

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Open an issue in this repository

---

**Happy site generating! 🎉**