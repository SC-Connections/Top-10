# Incremental Niche Generator

This document explains the incremental build system for the niche site generator.

## Overview

The niche site generator now supports two build modes to minimize API costs and build times:

1. **Incremental Mode** - Only builds new or changed niches
2. **Refresh Mode** - Only builds niches that haven't been updated in 7+ days

## How It Works

### State Tracking

The generator maintains a state file at `data/niches-state.json` that tracks:

```json
{
  "wireless-earbuds": {
    "hash": "d5f12b3b0a...",
    "lastBuild": "2025-12-08T15:34:13.000Z"
  },
  "bluetooth-headphones": {
    "hash": "98ab12cd34...",
    "lastBuild": "2025-12-08T15:34:13.000Z"
  }
}
```

Each niche has:
- `hash` - SHA-256 hash of the niche name (for change detection)
- `lastBuild` - ISO timestamp of when it was last built

### Incremental Mode (Default)

**Triggered by:** Push to `main` branch that changes `niches.csv`

**Logic:**
1. Loads the state file
2. For each niche in the CSV:
   - If it's not in the state → **BUILD** (new niche)
   - If the hash changed → **BUILD** (niche was modified)
   - Otherwise → **SKIP** (unchanged)

**Use case:** When you add or modify niches in the CSV

### Refresh Mode

**Triggered by:** Weekly schedule (Monday at 6 AM UTC)

**Logic:**
1. Loads the state file
2. For each niche in the CSV:
   - If it's not in the state → **BUILD** (never built)
   - If last build > 7 days ago → **BUILD** (needs refresh)
   - Otherwise → **SKIP** (recently updated)

**Use case:** Keeping product data fresh without rebuilding everything

## Usage

### Command Line

```bash
# Incremental mode (default)
npm run generate:incremental
# or
node site-generator.js --mode=incremental

# Refresh mode
npm run generate:refresh
# or
node site-generator.js --mode=refresh
```

### GitHub Actions

The workflow automatically chooses the right mode:

- **Push to `niches.csv`** → Incremental mode
- **Weekly schedule** → Refresh mode
- **Manual dispatch** → Incremental mode

## Examples

### Example 1: Adding a New Niche

1. Edit `niches.csv` and add `fitness-trackers`
2. Commit and push
3. Workflow runs in **incremental mode**
4. Only `fitness-trackers` is built (saves API calls on 100+ existing niches!)

### Example 2: Modifying an Existing Niche

Currently, niches are just simple names in the CSV. In the future, if we add more fields (like search terms, filters, etc.), changing any field will trigger a rebuild of that niche.

### Example 3: Weekly Refresh

1. Monday morning, scheduled workflow runs
2. Checks all niches against their `lastBuild` date
3. Builds only niches older than 7 days
4. Spreads API usage over time (roughly 1/7 of niches per week)

## State File Management

### Location
- `data/niches-state.json`
- Committed to git for persistence

### Initialization
- Empty object `{}` if file doesn't exist
- Gracefully handles missing or corrupt files

### Updates
- Updated after each successful niche build
- Saved at the end of each run

### Resetting State

To force a full rebuild:

```bash
# Delete the state file
rm data/niches-state.json

# Or edit it manually to remove specific niches
```

## Workflow Integration

The workflow has been updated to:

1. ✅ Only trigger on `niches.csv` changes (not all pushes to main)
2. ✅ Run conditional steps based on trigger type
3. ✅ Handle no-op cases (no changes to commit)
4. ✅ Safely rebase before pushing

## Benefits

### API Cost Savings
- **Before:** 100+ API calls every time workflow runs
- **After (incremental):** 1-5 API calls for new/changed niches
- **After (refresh):** ~15 API calls per week (1/7 of total)

### Build Time Savings
- Full build: 30+ minutes
- Incremental build: 1-5 minutes
- Refresh build: ~5-10 minutes

### Smart Scheduling
- New content: Built immediately when CSV changes
- Existing content: Refreshed weekly on rotating basis
- No unnecessary rebuilds of unchanged niches

## Troubleshooting

### "No changes to commit" in workflow
✅ This is normal! It means no niches needed building.

### State file not found
✅ Normal on first run. Generator creates it automatically.

### Want to force rebuild a specific niche
Edit `data/niches-state.json` and remove that niche's entry.

### Want to force rebuild everything
Delete `data/niches-state.json` or run with empty state.

## Technical Details

### Niche Identification
- Niches are identified by their **slug** (URL-friendly version of the name)
- Slug is created from the niche name: `Wireless Earbuds` → `wireless-earbuds`

### Hash Calculation
- Currently hashes the normalized niche name (trimmed, lowercase)
- In the future, could hash additional fields (search terms, filters, etc.)

### Age Calculation
- Uses ISO 8601 timestamps for consistency
- Calculates age in days: `(now - lastBuild) / 86400000`
- Default threshold: 7 days

## Future Enhancements

Potential improvements:

1. **Configurable refresh threshold** - Allow different ages per niche
2. **Priority niches** - Force certain niches to update more frequently
3. **Smart refresh** - Refresh based on product price changes or availability
4. **Parallel builds** - Build multiple niches concurrently
5. **Dry-run mode** - Preview what would be built without actually building
