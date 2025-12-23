# Top-10 Factory Repository

🏭 **Automated Repository Factory for Niche Sites**

This is the **factory repository** that automatically creates and seeds new GitHub repositories for each niche site. Each spawned repository is a standalone, self-contained niche site with its own build and deployment workflow.

## 🎯 Architecture Overview

### Factory Structure
```
top10-factory/
├── niches/
│   └── niches.yml              # List of niches to spawn
├── template/                   # Complete site generator template
│   ├── .github/workflows/
│   │   └── deploy.yml         # Per-repo deployment workflow
│   ├── site-generator.js      # Site generation engine
│   ├── templates/             # HTML/CSS templates
│   ├── package.json           # Dependencies
│   └── ... (all generator code)
├── scripts/
│   └── spawn_repos.py         # Repository spawning script
└── .github/workflows/
    └── spawn-repos.yml        # Factory automation workflow
```

### How It Works

1. **Add Niche**: Edit `niches/niches.yml` to add a new niche
2. **Factory Triggers**: Push to main or manually trigger workflow
3. **Repo Created**: Factory creates `top10-<slug>` repository under SC-Connections
4. **Template Seeded**: All template files copied to new repo
5. **Config Injected**: `niche.json` created with niche-specific configuration
6. **Auto-Deploy**: New repo's workflow builds and deploys to GitHub Pages

## 📝 Adding New Niches

Edit `niches/niches.yml`:

```yaml
niches:
  - slug: airfryer-accessories
    title: "Top Air Fryer Accessories"
  
  - slug: hiking-headlamps
    title: "Top Hiking Headlamps"
  
  - slug: your-new-niche    # <-- Add here
    title: "Your Niche Title"
```

**Field Descriptions:**
- `slug`: Used for repository name (`top10-<slug>`) and URL path
- `title`: Human-readable site title shown in headers and metadata

### Slug Guidelines
- Use lowercase with hyphens
- Keep it concise but descriptive
- Match the product category
- Examples: `bluetooth-earbuds`, `robot-vacuums`, `gaming-keyboards`

## 🚀 Usage

### Automatic (Recommended)

1. Edit `niches/niches.yml` in this repository
2. Commit and push to `main` branch
3. Factory workflow automatically triggers
4. New repositories created and seeded
5. Check Actions tab for progress

### Manual Trigger

1. Go to Actions tab in GitHub
2. Select "Factory - Spawn Niche Repositories" workflow
3. Click "Run workflow"
4. Select branch (main)
5. Click "Run workflow" button

## 🔑 Required Secrets

The factory workflow requires a GitHub Personal Access Token with specific permissions:

### Setting Up REPO_FACTORY_TOKEN

1. **Create Fine-Grained PAT**:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Click "Generate new token"
   - Name: `Top-10 Factory Token`
   - Expiration: Choose appropriate duration
   - Repository access: Select organization repositories
   
2. **Required Permissions**:
   - ✅ Repository administration (create repositories)
   - ✅ Contents: Read and write
   - ✅ Metadata: Read-only (automatic)
   - ✅ Pages: Read and write (optional but recommended)

3. **Add to Repository Secrets**:
   - Go to this repository's Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `REPO_FACTORY_TOKEN`
   - Value: Paste your PAT
   - Click "Add secret"

### Other Required Secrets (for spawned repos)

Each spawned repository needs these secrets for site generation:

- `RAPIDAPI_KEY`: Your RapidAPI key for Amazon product data
  - Get from: https://rapidapi.com/letscrape-6bRBa3QguO5/api/amazon-real-time-api

**Note**: These secrets must be added manually to each spawned repository, or configured at the organization level.

## 📦 Template Structure

The `template/` directory contains everything needed for a niche site:

### Core Generator Files
- `site-generator.js` - Main site generation engine
- `generate-seo.js` - SEO content generation
- `generate-blog.js` - Blog article generation
- `data-sources.js` - Multi-source data gathering
- `amazon-scraper.js`, `google-trends.js`, `api-fallback.js` - Data sources

### Template Files
- `templates/template.html` - Main page structure
- `templates/global.css` - Site styling
- `templates/blog-template.html` - Blog article template
- `templates/product-template.html` - Product card template

### Configuration
- `package.json` - Node.js dependencies
- `niches.csv` - Will be overwritten per repo
- `niche.json` - Injected by factory (niche-specific config)

### Deployment
- `.github/workflows/deploy.yml` - Autonomous build and deploy workflow

## 🔄 Spawned Repository Workflow

Each created repository is autonomous and includes:

### 1. **Initial Push**
- Factory script commits all template files
- Includes `niche.json` with configuration
- Pushes to `main` branch

### 2. **Automatic Build** (triggered by initial push)
- Reads `niche.json` for niche configuration
- Updates `niches.csv` with single niche
- Runs site generator
- Generates niche site folder (e.g., `/airfryer-accessories/`)
- Creates root redirect page

### 3. **Automatic Deployment**
- Configures GitHub Pages
- Uploads site artifact
- Deploys to `https://sc-connections.github.io/top10-<slug>/`

### 4. **Ongoing Updates**
- Weekly scheduled updates (Monday 6 AM UTC)
- Manual workflow dispatch available
- Push to main branch triggers rebuild

## 🛠️ Development

### Local Testing

To test the factory script locally:

```bash
# Install dependencies
pip install pyyaml requests

# Set environment variables
export GH_TOKEN="your-github-pat"
export ORG="SC-Connections"
export TEMPLATE_DIR="template"
export NICHES_FILE="niches/niches.yml"

# Run factory script
python scripts/spawn_repos.py
```

### Testing Template Changes

1. Make changes to files in `template/` directory
2. Test locally by copying to a test repo
3. Commit template changes to this factory repo
4. New repos spawned after commit will use updated template
5. Existing repos are **not** automatically updated

## 📋 Spawned Repository List

Repositories created by this factory:

- `top10-airfryer-accessories` - [View Site](https://sc-connections.github.io/top10-airfryer-accessories/)
- `top10-hiking-headlamps` - [View Site](https://sc-connections.github.io/top10-hiking-headlamps/)

*(List will grow as new niches are added)*

## ⚙️ Advanced Configuration

### Environment Variables (spawn_repos.py)

| Variable | Default | Description |
|----------|---------|-------------|
| `GH_TOKEN` | *(required)* | GitHub Personal Access Token |
| `ORG` | `SC-Connections` | GitHub organization name |
| `TEMPLATE_DIR` | `template` | Path to template directory |
| `NICHES_FILE` | `niches/niches.yml` | Path to niches configuration |

### Git Configuration

The factory uses the following git identity for initial commits:

- **Name**: `github-actions[bot]`
- **Email**: `41898282+github-actions[bot]@users.noreply.github.com`

## 🐛 Troubleshooting

### Factory workflow fails with "API error"

**Cause**: Invalid or expired `REPO_FACTORY_TOKEN`

**Solution**: 
1. Check token hasn't expired
2. Verify token has required permissions
3. Regenerate token if needed
4. Update `REPO_FACTORY_TOKEN` secret

### Repository already exists

**Behavior**: Factory skips existing repositories

**Action**: This is normal. Factory will not overwrite existing repos.

### Spawned repo workflow fails

**Cause**: Missing `RAPIDAPI_KEY` secret in spawned repo

**Solution**: 
1. Go to spawned repository Settings → Secrets
2. Add `RAPIDAPI_KEY` secret
3. Manually trigger workflow or push to main

### Template changes not reflected in new repos

**Cause**: Template changes committed after repo was spawned

**Action**: Template changes only affect **new** repositories. Existing repos must be updated manually or deleted and re-spawned.

## 📚 Related Documentation

- [Original Top-10 Repository](https://github.com/SC-Connections/Top-10)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub API Documentation](https://docs.github.com/en/rest)

## 🤝 Contributing

To contribute to the factory:

1. Fork this repository
2. Create a feature branch
3. Make changes to factory code or template
4. Test locally if possible
5. Submit pull request

**Note**: Do NOT modify the original Top-10 repository directly. All factory-related changes go in this repository.

## 📄 License

MIT License - Same as original Top-10 repository

---

**Built with ❤️ for automated niche site generation**
