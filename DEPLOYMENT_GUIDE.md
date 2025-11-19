# Deployment Guide - Fixing the 404 Issue

## Problem Summary

The URL `https://sc-connections.github.io/Top-10/bluetooth-headphones/` returns a 404 error because:

1. **The niche folder doesn't exist yet** - The `bluetooth-headphones/` folder has not been generated in the repository
2. **Race condition in workflows** - Both build and deploy workflows triggered simultaneously, causing deployment before generation
3. **Missing validation** - No checks to ensure folders exist before deployment

## Root Cause

The repository has two workflows:
- `build-sites.yml` - Generates niche folders and commits them
- `deploy-pages.yml` - Deploys to GitHub Pages

**BEFORE THIS FIX**: Both workflows triggered on `push to main` simultaneously, creating a race condition where deploy would run before folders were generated.

**AFTER THIS FIX**: Deploy workflow now uses `workflow_run` trigger and only runs AFTER build workflow completes successfully.

## Changes Made

### 1. Fixed Race Condition (deploy-pages.yml)
- Changed trigger from `push` to `workflow_run`
- Deploy now waits for build workflow to complete
- Only deploys if build succeeded

### 2. Added Validation (deploy-pages.yml)
- New validation step checks all niche folders exist
- Fails deployment with clear error if folders missing
- Prevents deploying broken sites

### 3. Added Verification (build-sites.yml)
- New verification step after site generation
- Ensures all niche folders were created successfully
- Fails workflow if generation incomplete

### 4. Improved Error Handling
- Puppeteer scrapers now gracefully fallback to RapidAPI
- Added `SKIP_PUPPETEER` environment variable
- Better error messages throughout

### 5. Fixed Root Index (generate-root-index.js)
- Excluded `data/` folder from niche list
- Now only shows actual niche site folders

## Next Steps to Deploy

### Step 1: Merge This PR
Merge this PR to the `main` branch to apply all fixes.

### Step 2: Verify Secrets
Ensure the following GitHub secrets are configured:
- `RAPIDAPI_KEY` - **REQUIRED** for product data fetching
- `AMAZON_AFFILIATE_ID` - Optional (defaults to 'scconnec0d-20')

To check/add secrets:
1. Go to repository Settings → Secrets and variables → Actions
2. Verify `RAPIDAPI_KEY` is set
3. If missing, add it with your RapidAPI key

### Step 3: Trigger Build Workflow
After merging, manually trigger the build workflow:

1. Go to Actions tab in GitHub
2. Select "Build and Deploy Niche Sites" workflow
3. Click "Run workflow" → Select "main" branch → Click "Run workflow"

This will:
- Generate the `bluetooth-headphones/` folder
- Create all necessary files (index.html, blog posts, etc.)
- Commit and push the folder to the repository

### Step 4: Verify Build Completed
Watch the workflow run and ensure:
- ✅ Site generation completes successfully
- ✅ Verification step passes
- ✅ Niche folder is committed to repo
- ✅ Workflow shows as "success"

If it fails:
- Check the workflow logs for errors
- Most common issues:
  - Missing RAPIDAPI_KEY secret
  - API rate limits
  - Network timeouts

### Step 5: Deploy Workflow Runs Automatically
After build workflow succeeds:
- Deploy workflow will automatically trigger
- It will validate folders exist
- Deploy to GitHub Pages

### Step 6: Verify Site Works
Wait 2-3 minutes for GitHub Pages to update, then test:
- ✅ https://sc-connections.github.io/Top-10/ (root index)
- ✅ https://sc-connections.github.io/Top-10/bluetooth-headphones/ (niche site)

## Troubleshooting

### Issue: Build workflow fails with "RAPIDAPI_KEY is not set"
**Solution**: Add the RAPIDAPI_KEY secret in repository settings

### Issue: Build workflow fails with Puppeteer errors
**Solution**: 
- This is expected - Puppeteer will fail and fallback to RapidAPI
- As long as RapidAPI works, site will generate successfully
- To skip Puppeteer entirely, set `SKIP_PUPPETEER: 'true'` in workflow

### Issue: Deploy workflow doesn't run after build
**Solution**:
- Check build workflow completed successfully
- If build failed, fix the issue and re-run build
- Deploy only runs after successful build

### Issue: Deploy workflow fails with "Missing niche folder"
**Solution**:
- Build workflow didn't generate folders successfully
- Check build workflow logs for errors
- Re-run build workflow
- Verify RAPIDAPI_KEY is valid

### Issue: Site still shows 404 after deployment
**Solution**:
- Wait 2-3 minutes for GitHub Pages cache to clear
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check GitHub Pages settings are enabled
- Verify folder was actually committed to repository

## Monitoring

After deployment, you can monitor:

1. **Workflow Runs**: Actions tab → Recent workflow runs
2. **Deployed Content**: Repository root → Check for niche folders
3. **Live Site**: GitHub Pages URL

## Maintenance

- Build workflow runs weekly (Monday 6 AM UTC) to update product data
- Deploy workflow runs after each successful build
- Niche folders are committed to the repository and tracked in git

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     MAIN BRANCH                          │
│  - niches.csv                                            │
│  - site-generator.js                                     │
│  - bluetooth-headphones/ (generated folder)              │
│  - index.html (root index)                               │
└─────────────────────────────────────────────────────────┘
                            │
                            │ Push to main
                            ▼
┌─────────────────────────────────────────────────────────┐
│         BUILD WORKFLOW (build-sites.yml)                 │
│  1. Generate niche folders                               │
│  2. Verify folders created                               │
│  3. Commit and push folders                              │
│  4. SUCCESS → Trigger deploy workflow                    │
└─────────────────────────────────────────────────────────┘
                            │
                            │ workflow_run (on success)
                            ▼
┌─────────────────────────────────────────────────────────┐
│        DEPLOY WORKFLOW (deploy-pages.yml)                │
│  1. Validate niche folders exist                         │
│  2. Generate root index.html                             │
│  3. Upload to GitHub Pages                               │
│  4. Deploy                                               │
└─────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
                   GitHub Pages Live Site
         https://sc-connections.github.io/Top-10/
```

## Summary

The fix ensures:
- ✅ No race condition - deployment waits for build
- ✅ Validation prevents deploying without folders
- ✅ Clear error messages when issues occur
- ✅ Graceful fallback if Puppeteer fails
- ✅ Root index only shows valid niche folders

After merging and triggering the build workflow, the bluetooth-headphones site will be generated and deployed successfully!

## Before vs After Comparison

### BEFORE (Broken - Race Condition)
```
Push to main
     │
     ├─────────────────┬─────────────────┐
     │                 │                 │
     ▼                 ▼                 ▼
Build Workflow    Deploy Workflow   (Simultaneous)
Generating...     Deploying now!
     │                 │
     │                 └──► Deploy without folders ❌ 404
     │
     └──► Folders committed (too late)
```

### AFTER (Fixed - Sequential Execution)
```
Push to main
     │
     ▼
Build Workflow
  │
  ├─ Generate folders
  ├─ Verify folders created ✅
  ├─ Commit & push
  │
  └─ SUCCESS ✅
     │
     │ (workflow_run trigger)
     │
     ▼
Deploy Workflow
  │
  ├─ Validate folders exist ✅
  ├─ Generate root index
  ├─ Upload to GitHub Pages
  │
  └─ SUCCESS ✅
     │
     ▼
   Site Live! ✅
```

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Trigger** | Both on `push` | Deploy on `workflow_run` |
| **Timing** | Simultaneous | Sequential |
| **Validation** | None | Both workflows validate |
| **Error Handling** | Silent failures | Fail with clear errors |
| **Race Condition** | Yes ❌ | No ✅ |
| **Result** | 404 errors | Working sites ✅ |

