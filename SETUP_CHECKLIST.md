# Factory Setup Checklist

Use this checklist to verify your factory implementation is complete and ready to use.

## ✅ Pre-Deployment Checklist

### 1. Factory Structure
- [ ] `niches/niches.yml` exists and contains example niches
- [ ] `scripts/spawn_repos.py` exists and is executable
- [ ] `.github/workflows/spawn-repos.yml` exists
- [ ] `template/` directory exists with all files
- [ ] `FACTORY_README.md` documentation exists
- [ ] `QUICK_START.md` guide exists

### 2. Template Completeness
- [ ] `template/site-generator.js` exists
- [ ] `template/templates/` directory exists with HTML/CSS files
- [ ] `template/.github/workflows/deploy.yml` exists
- [ ] `template/README.template.md` exists with placeholders
- [ ] `template/package.json` exists
- [ ] All 14 JavaScript generator files present

### 3. Configuration
- [ ] `niches/niches.yml` is valid YAML (run: `python3 -c "import yaml; yaml.safe_load(open('niches/niches.yml'))"`)
- [ ] `.github/workflows/spawn-repos.yml` is valid YAML
- [ ] `template/.github/workflows/deploy.yml` is valid YAML
- [ ] `scripts/spawn_repos.py` has valid syntax (run: `python3 -m py_compile scripts/spawn_repos.py`)

### 4. GitHub Setup
- [ ] Factory repository exists at `SC-Connections/Top-10`
- [ ] Repository has Actions enabled
- [ ] Repository has Pages enabled (for original site)

## 🔑 Secrets Configuration

### Factory Repository Secrets
- [ ] Create fine-grained Personal Access Token with:
  - [ ] Repository administration permission
  - [ ] Contents read/write permission
  - [ ] Pages read/write permission
- [ ] Add token as `REPO_FACTORY_TOKEN` secret in repository settings
- [ ] Verify secret is accessible in Actions

### Organization Secrets (Recommended)
- [ ] Add `RAPIDAPI_KEY` at organization level
- [ ] Set repository access to "All repositories"
- [ ] Verify all spawned repos will inherit this secret

### Alternative: Per-Repository Secrets
If not using organization secrets:
- [ ] Document that each spawned repo needs `RAPIDAPI_KEY`
- [ ] Prepare to add secret manually after each spawn

## 🚀 First Test Run

### Before First Spawn
- [ ] Read `QUICK_START.md`
- [ ] Choose a test niche (e.g., "gaming-keyboards")
- [ ] Prepare to monitor factory workflow

### Add Test Niche
- [ ] Edit `niches/niches.yml`
- [ ] Add test niche with slug and title
- [ ] Verify YAML is valid
- [ ] Commit and push to main branch

### Monitor Factory Workflow
- [ ] Go to Actions tab in GitHub
- [ ] Verify "Factory - Spawn Niche Repositories" starts
- [ ] Wait for workflow to complete (2-3 minutes)
- [ ] Check for green checkmark (success)

### Verify Repository Creation
- [ ] New repo exists at `SC-Connections/top10-<slug>`
- [ ] Repository is public
- [ ] `niche.json` file exists in repo
- [ ] `README.md` was generated with correct niche info
- [ ] All template files copied successfully

### Verify Deployment Workflow
- [ ] Go to spawned repo Actions tab
- [ ] Verify "Build and Deploy Niche Site" starts automatically
- [ ] Add `RAPIDAPI_KEY` secret if not using org-level secret
- [ ] Wait for workflow to complete (5-10 minutes)
- [ ] Check for green checkmark

### Verify Live Site
- [ ] Visit `https://sc-connections.github.io/top10-<slug>/`
- [ ] Site loads without 404 error
- [ ] Products are displayed
- [ ] Site is properly formatted
- [ ] Affiliate links work

## 🎯 Post-Deployment Validation

### Repository Health
- [ ] Spawned repo has all expected files
- [ ] Workflow runs successfully
- [ ] No errors in workflow logs
- [ ] GitHub Pages is enabled
- [ ] Site deployed successfully

### Site Quality
- [ ] Site has 8-10 products
- [ ] Product images load
- [ ] Affiliate links include `scconnec0d-20` tag
- [ ] SEO meta tags present
- [ ] Mobile responsive design

### Ongoing Maintenance
- [ ] Weekly updates schedule working
- [ ] New niches spawn successfully
- [ ] Template changes apply to new repos only
- [ ] Original Top-10 site still works

## 📝 Common Issues Checklist

### Factory Workflow Fails
- [ ] Check `REPO_FACTORY_TOKEN` is configured
- [ ] Verify token hasn't expired
- [ ] Confirm token has admin permissions
- [ ] Check niches.yml syntax

### Spawned Repo Build Fails
- [ ] Check `RAPIDAPI_KEY` is configured
- [ ] Verify API quota not exceeded
- [ ] Check site-generator.js for errors
- [ ] Verify template files copied correctly

### Site Shows 404
- [ ] Wait 5-10 minutes for Pages deployment
- [ ] Check Pages settings in repo
- [ ] Verify workflow completed successfully
- [ ] Check for errors in deployment logs

### No Products Generated
- [ ] Verify RAPIDAPI_KEY is valid
- [ ] Check API rate limits
- [ ] Try different niche name
- [ ] Check site-generator.js logs

## 📊 Success Indicators

When everything is working correctly:

- [ ] ✅ Factory workflow: Green checkmark
- [ ] ✅ Spawned repo created: Within 2-3 minutes
- [ ] ✅ Site deployment: Within 5-10 minutes
- [ ] ✅ Live site: Accessible and functional
- [ ] ✅ Products: 8-10 quality products displayed
- [ ] ✅ Affiliate links: Working with correct tag
- [ ] ✅ Weekly updates: Scheduled and running
- [ ] ✅ New niches: Spawn successfully on demand

## 🎉 Ready for Production

When all checkboxes are checked:

- [ ] All factory components validated
- [ ] First test niche successful
- [ ] Documentation reviewed
- [ ] Secrets configured
- [ ] Workflows tested
- [ ] Live site verified

**Congratulations!** Your factory is ready to spawn unlimited niche sites! 🚀

## 📞 Need Help?

If you encounter issues:

1. **Check logs**: Actions tab → Select workflow → View detailed logs
2. **Review docs**: FACTORY_README.md, FACTORY_IMPLEMENTATION.md
3. **Verify setup**: Go through this checklist again
4. **Check secrets**: Ensure tokens are valid and not expired
5. **Test locally**: Run Python script with test data

---

**Last Updated**: December 23, 2025  
**Version**: 1.0.0
