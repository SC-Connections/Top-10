/**
 * Niche State Manager
 * Manages persistent state for incremental niche generation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATE_FILE = path.join(__dirname, 'data', 'niches-state.json');

/**
 * Load niche state from disk
 * @returns {Object} State object mapping niche slugs to their build info
 */
function loadNicheState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const content = fs.readFileSync(STATE_FILE, 'utf-8');
            const state = JSON.parse(content);
            console.log(`📖 Loaded state for ${Object.keys(state).length} niches`);
            return state;
        }
    } catch (error) {
        console.warn(`⚠️  Failed to load state file: ${error.message}`);
        console.warn(`⚠️  Starting with empty state`);
    }
    return {};
}

/**
 * Save niche state to disk
 * @param {Object} state - State object to save
 */
function saveNicheState(state) {
    try {
        const stateDir = path.dirname(STATE_FILE);
        if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
        }
        
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        console.log(`💾 Saved state for ${Object.keys(state).length} niches`);
    } catch (error) {
        console.error(`❌ Failed to save state file: ${error.message}`);
        throw error;
    }
}

/**
 * Hash a niche row for change detection
 * @param {string} niche - Niche name (single row from CSV)
 * @returns {string} SHA-256 hash
 */
function hashNicheRow(niche) {
    // For simple CSV format (just niche names), hash the normalized name
    const normalized = niche.trim().toLowerCase();
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Create URL-friendly slug from niche name (duplicated from site-generator for consistency)
 * @param {string} niche - Niche name
 * @returns {string} Slug
 */
function createSlug(niche) {
    return niche
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Get list of niches to build in incremental mode
 * Only builds new niches or niches whose content changed
 * @param {Array<string>} niches - Array of niche names from CSV
 * @param {Object} state - Current state object
 * @returns {Array<Object>} Array of {niche, slug, hash} objects to build
 */
function getNichesToBuildIncremental(niches, state) {
    const result = [];
    
    for (const niche of niches) {
        const slug = createSlug(niche);
        const hash = hashNicheRow(niche);
        const existing = state[slug];
        
        if (!existing) {
            console.log(`🆕 New niche: ${slug}`);
            result.push({ niche, slug, hash });
        } else if (existing.hash !== hash) {
            console.log(`🔄 Changed niche: ${slug}`);
            result.push({ niche, slug, hash });
        } else {
            console.log(`⏭️  Skipping unchanged niche: ${slug}`);
        }
    }
    
    return result;
}

/**
 * Get list of niches to build in refresh mode
 * Builds niches that haven't been built in maxAgeDays or never built
 * @param {Array<string>} niches - Array of niche names from CSV
 * @param {Object} state - Current state object
 * @param {number} maxAgeDays - Maximum age in days before refresh
 * @returns {Array<Object>} Array of {niche, slug, hash} objects to build
 */
function getNichesToBuildRefresh(niches, state, maxAgeDays = 7) {
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const result = [];
    
    for (const niche of niches) {
        const slug = createSlug(niche);
        const hash = hashNicheRow(niche);
        const existing = state[slug];
        
        if (!existing) {
            console.log(`🆕 Refresh mode: never built niche, adding: ${slug}`);
            result.push({ niche, slug, hash });
            continue;
        }
        
        const lastBuild = new Date(existing.lastBuild).getTime();
        const ageDays = (now - lastBuild) / msPerDay;
        
        if (Number.isNaN(ageDays) || ageDays >= maxAgeDays) {
            console.log(`♻️  Refreshing niche ${slug} (age: ${ageDays.toFixed(1)} days)`);
            result.push({ niche, slug, hash });
        } else {
            console.log(`⏭️  Skipping fresh niche ${slug} (age: ${ageDays.toFixed(1)} days)`);
        }
    }
    
    return result;
}

module.exports = {
    loadNicheState,
    saveNicheState,
    hashNicheRow,
    createSlug,
    getNichesToBuildIncremental,
    getNichesToBuildRefresh
};
