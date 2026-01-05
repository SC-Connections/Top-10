# Per-Niche Repository Publishing (Optional Feature)

> **Note**: This feature is currently **not in use**. The repository follows a "one repo, all niches" architecture where all niche sites are hosted within this repository at `/{slug}/` paths and deployed via GitHub Pages. This document is kept for reference in case per-niche repositories are needed in the future.

## Overview

When configured with a GitHub Personal Access Token, the generator can automatically create and publish separate repositories for each niche site.

## How It Works

When configured with a GitHub Personal Access Token (`GH_PAT` or `REPO_FACTORY_TOKEN`), the generator can:

1. **Create a separate GitHub repository** for each niche site at `https://github.com/SC-Connections/<niche-slug>`
2. **Push all site content** to the new repository
3. **Enable GitHub Pages** automatically on the `main` branch
4. **Output the public URL** at `https://sc-connections.github.io/<niche-slug>/`

## Benefits

- ✅ Each niche site has its own dedicated repository
- ✅ Independent version control for each site
- ✅ Separate GitHub Pages URLs for better SEO
- ✅ Easier to manage individual sites
- ✅ Falls back gracefully if token is not configured

## Setup

To enable this feature:

1. Create a fine-grained Personal Access Token with the following permissions:
   - Repository administration (create repos)
   - Contents read/write
   - Pages read/write

2. Add the token as a secret in GitHub Actions settings:
   - Secret name: `REPO_FACTORY_TOKEN` (for spawn-repos workflow)
   - Or: `GH_PAT` (for other publishing workflows)

3. Enable the `spawn-repos.yml` workflow by ensuring it's not disabled

4. The workflow will automatically create repositories when niches are added to `niches/niches.yml`

## Related Workflow

See `.github/workflows/spawn-repos.yml` for the repository spawning workflow implementation.

## Current Architecture

The current "one repo, all niches" approach is simpler and has these advantages:

- ✅ Easier maintenance (single repository)
- ✅ Centralized GitHub Actions workflows
- ✅ All sites accessible from one domain
- ✅ Simplified deployment process
- ✅ No need for PAT tokens with elevated permissions

Sites are served at: `https://sc-connections.github.io/Top-10/{niche-slug}/`
