/**
 * Niche Failure Tracker
 * Tracks consecutive failures and error reasons for safe pruning decisions
 */

const fs = require('fs');
const path = require('path');

const FAILURE_STATE_FILE = path.join(__dirname, 'data', 'niche-failures.json');
const CONSECUTIVE_FAILURE_THRESHOLD = 3; // Only prune after 3 consecutive failures

/**
 * Load failure tracking state from disk
 * @returns {Object} State object mapping niche slugs to failure info
 */
function loadFailureState() {
    try {
        if (fs.existsSync(FAILURE_STATE_FILE)) {
            const content = fs.readFileSync(FAILURE_STATE_FILE, 'utf-8');
            const state = JSON.parse(content);
            console.log(`📖 Loaded failure state for ${Object.keys(state).length} niches`);
            return state;
        }
    } catch (error) {
        console.warn(`⚠️  Failed to load failure state file: ${error.message}`);
        console.warn(`⚠️  Starting with empty failure state`);
    }
    return {};
}

/**
 * Save failure tracking state to disk
 * @param {Object} state - State object to save
 */
function saveFailureState(state) {
    try {
        const stateDir = path.dirname(FAILURE_STATE_FILE);
        if (!fs.existsSync(stateDir)) {
            fs.mkdirSync(stateDir, { recursive: true });
        }
        
        fs.writeFileSync(FAILURE_STATE_FILE, JSON.stringify(state, null, 2));
        console.log(`💾 Saved failure state for ${Object.keys(state).length} niches`);
    } catch (error) {
        console.error(`❌ Failed to save failure state file: ${error.message}`);
        throw error;
    }
}

/**
 * Record a successful niche generation
 * Resets failure count and updates last success timestamp
 * @param {string} slug - Niche slug
 * @param {Object} state - Current failure state
 */
function recordSuccess(slug, state) {
    state[slug] = {
        consecutiveEmptyRuns: 0,
        lastSuccessTimestamp: new Date().toISOString(),
        lastErrorReason: null
    };
}

/**
 * Record a failed niche generation
 * Increments failure count and records error reason
 * @param {string} slug - Niche slug
 * @param {string} errorReason - Reason for failure (e.g., 'blocked', 'missing_key', 'api_error', 'no_products')
 * @param {Object} state - Current failure state
 */
function recordFailure(slug, errorReason, state) {
    if (!state[slug]) {
        state[slug] = {
            consecutiveEmptyRuns: 0,
            lastSuccessTimestamp: null,
            lastErrorReason: null
        };
    }
    
    state[slug].consecutiveEmptyRuns += 1;
    state[slug].lastErrorReason = errorReason;
    state[slug].lastFailureTimestamp = new Date().toISOString();
}

/**
 * Determine if a niche should be pruned based on failure history
 * @param {string} slug - Niche slug
 * @param {Object} state - Current failure state
 * @returns {Object} Decision object with shouldPrune, reason, and failureCount
 */
function shouldPruneNiche(slug, state) {
    const nicheState = state[slug];
    
    // If no failure history, don't prune
    if (!nicheState || nicheState.consecutiveEmptyRuns === 0) {
        return {
            shouldPrune: false,
            reason: 'No failure history',
            failureCount: 0
        };
    }
    
    const failureCount = nicheState.consecutiveEmptyRuns;
    const lastErrorReason = nicheState.lastErrorReason;
    
    // Don't prune if we haven't reached the threshold
    if (failureCount < CONSECUTIVE_FAILURE_THRESHOLD) {
        return {
            shouldPrune: false,
            reason: `Only ${failureCount} consecutive failures (threshold: ${CONSECUTIVE_FAILURE_THRESHOLD})`,
            failureCount
        };
    }
    
    // Don't prune if the error is transient (blocked, missing key, API error)
    const transientErrors = ['blocked', 'missing_key', 'api_error', 'blocked_captcha', 'timeout', 'puppeteer_launch_failed'];
    if (transientErrors.includes(lastErrorReason)) {
        return {
            shouldPrune: false,
            reason: `Transient error: ${lastErrorReason} (not pruning)`,
            failureCount
        };
    }
    
    // Only prune if we have consistent failures with non-transient errors
    return {
        shouldPrune: true,
        reason: `${failureCount} consecutive failures with error: ${lastErrorReason}`,
        failureCount
    };
}

/**
 * Detect error reason from niche generation result
 * @param {string} slug - Niche slug
 * @param {boolean} hasProducts - Whether niche has products
 * @returns {string} Error reason code
 */
function detectErrorReason(slug, hasProducts) {
    // Check if index.html exists
    const indexPath = path.join(__dirname, slug, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
        return 'generation_failed';
    }
    
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    // Check for various error conditions
    if (content.includes('No Results Available') || 
        content.includes('No products available') ||
        content.includes('no products with complete information')) {
        
        // Check if it's due to validation failure or truly no products
        if (content.includes('check back soon') || content.includes('updating our')) {
            return 'no_valid_products';
        }
        
        return 'no_products';
    }
    
    // Check for product structured data
    if (!content.includes('"@type": "Product"')) {
        return 'no_products';
    }
    
    // If we reach here, the niche has products
    return null;
}

module.exports = {
    loadFailureState,
    saveFailureState,
    recordSuccess,
    recordFailure,
    shouldPruneNiche,
    detectErrorReason,
    CONSECUTIVE_FAILURE_THRESHOLD
};
