# Quick Start Guide: Factory Architecture

## 🚀 Getting Started with the Repository Factory

This guide will help you start spawning new niche repositories using the factory system.

## Prerequisites

### 1. Create GitHub Personal Access Token

You need a **fine-grained** Personal Access Token with these permissions:

**Steps:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Configure:
   - **Name**: `Top-10 Factory Token`
   - **Expiration**: 90 days (or as needed)
   - **Repository access**: Select "SC-Connections" organization
   - **Permissions**:
     - ✅ Administration: Read and write (required to create repos)
     - ✅ Contents: Read and write
     - ✅ Metadata: Read-only (automatic)
     - ✅ Pages: Read and write

4. Click "Generate token"
5. **Copy the token** (you won't see it again!)

### 2. Add Token to Repository Secrets

1. Go to this repository: https://github.com/SC-Connections/Top-10
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add:
   - **Name**: `REPO_FACTORY_TOKEN`
   - **Secret**: (paste your token)
5. Click **"Add secret"**

## 📝 Adding Your First Niche

### Method 1: GitHub Web Interface (Easiest)

1. **Go to**: https://github.com/SC-Connections/Top-10/blob/main/niches/niches.yml

2. **Click** the pencil icon (✏️) to edit

3. **Add your niche**:
   ```yaml
   niches:
     - slug: airfryer-accessories
       title: "Top Air Fryer Accessories"
     
     - slug: hiking-headlamps
       title: "Top Hiking Headlamps"
     
     # Add your new niche here:
     - slug: gaming-keyboards
       title: "Top Gaming Keyboards"
   ```

4. **Scroll down** and commit:
   - Commit message: `Add gaming-keyboards niche`
   - Select: "Commit directly to the main branch"
   - Click **"Commit changes"**

5. **Watch the factory run**:
   - Go to **Actions** tab
   - You'll see "Factory - Spawn Niche Repositories" running
   - Click on it to see progress

6. **Check the new repository**:
   - After workflow completes (2-3 minutes)
   - New repo created: `https://github.com/SC-Connections/top10-gaming-keyboards`
   - Site URL: `https://sc-connections.github.io/top10-gaming-keyboards/`

### Method 2: Command Line (For Developers)

```bash
# 1. Clone repository
git clone https://github.com/SC-Connections/Top-10.git
cd Top-10

# 2. Edit niches file
vim niches/niches.yml

# 3. Add your niche (same format as above)

# 4. Commit and push
git add niches/niches.yml
git commit -m "Add gaming-keyboards niche"
git push origin main

# 5. Factory automatically runs
# Check Actions tab for progress
```

## 🔧 Configuring Spawned Repositories

After a repository is created, you need to add secrets:

### Required Secrets for Each Spawned Repo

**Option A: Manual (Per Repository)**

1. Go to spawned repo: `https://github.com/SC-Connections/top10-<slug>`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - **RAPIDAPI_KEY**: Your Amazon Real-Time API key
   - **AMAZON_AFFILIATE_ID**: `scconnec0d-20` (or your affiliate ID)

**Option B: Organization Level (Recommended)**

1. Go to: https://github.com/organizations/SC-Connections/settings/secrets/actions
2. Click **"New organization secret"**
3. Add:
   - **RAPIDAPI_KEY**: Your API key
   - **Repository access**: "All repositories"
4. This automatically applies to all spawned repos!

## 📊 Verifying Everything Works

### 1. Check Factory Workflow

- Go to: https://github.com/SC-Connections/Top-10/actions
- Look for "Factory - Spawn Niche Repositories"
- Status should be: ✅ Green (success)

### 2. Check Spawned Repository

- Go to: `https://github.com/SC-Connections/top10-<slug>`
- Verify files exist:
  - ✅ niche.json
  - ✅ site-generator.js
  - ✅ .github/workflows/deploy.yml
  - ✅ README.md

### 3. Check Deployment

- Go to spawned repo → **Actions** tab
- Look for "Build and Deploy Niche Site"
- First run may take 5-10 minutes
- Status should be: ✅ Green

### 4. Check Live Site

- Visit: `https://sc-connections.github.io/top10-<slug>/`
- You should see the generated niche site
- If 404, wait a few minutes for Pages to deploy

## 🐛 Troubleshooting

### Factory Workflow Failed

**Error: "REPO_FACTORY_TOKEN not set"**
- **Solution**: Add the token to repository secrets (see step 2 above)

**Error: "API rate limit exceeded"**
- **Solution**: Wait an hour and try again, or use a different token

**Error: "Permission denied"**
- **Solution**: Verify token has "Administration" permission

### Spawned Repo Deployment Failed

**Error: "RAPIDAPI_KEY not set"**
- **Solution**: Add RAPIDAPI_KEY secret to spawned repo (or organization)

**Error: "No products found"**
- **Cause**: API issue or niche has no matching products
- **Solution**: Check API status, try a different niche

**Pages showing 404**
- **Cause**: Deployment still in progress
- **Solution**: Wait 5-10 minutes, then check Settings → Pages

## 🎯 Quick Reference

### Adding a Niche

```yaml
- slug: product-category      # Lowercase with hyphens
  title: "Product Category"   # Title case, descriptive
```

### Repository URLs

- **Factory**: `https://github.com/SC-Connections/Top-10`
- **Spawned**: `https://github.com/SC-Connections/top10-<slug>`
- **Live Site**: `https://sc-connections.github.io/top10-<slug>/`

### Key Files

| File | Purpose |
|------|---------|
| `niches/niches.yml` | Define niches to spawn |
| `scripts/spawn_repos.py` | Repository creation script |
| `template/` | Site generator template |
| `.github/workflows/spawn-repos.yml` | Factory automation |

### Workflow Triggers

| Trigger | When |
|---------|------|
| Push to main | When niches.yml changes |
| Manual dispatch | Click "Run workflow" in Actions |

## 📚 Next Steps

1. ✅ **Add REPO_FACTORY_TOKEN** (if not done)
2. ✅ **Add your first niche** to niches.yml
3. ✅ **Watch the factory run** in Actions tab
4. ✅ **Configure spawned repo** with RAPIDAPI_KEY
5. ✅ **Verify site deployment** at GitHub Pages URL
6. 🎉 **Repeat for more niches!**

## 📞 Need Help?

- **Check logs**: Actions tab → Select workflow → View logs
- **Read docs**: FACTORY_README.md, FACTORY_IMPLEMENTATION.md
- **Verify structure**: Ensure all files from implementation are present

---

**Ready to spawn your first niche repository?** 🚀

1. Add REPO_FACTORY_TOKEN secret
2. Edit niches/niches.yml
3. Commit and watch the magic happen!
