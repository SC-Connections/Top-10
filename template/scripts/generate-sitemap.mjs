#!/usr/bin/env node

/**
 * Sitemap Generator for SC-Connections/Top-10
 * 
 * This script automatically generates a sitemap.xml for all HTML pages in the repository.
 * It scans niche folders, converts file paths to GitHub Pages URLs, and creates a valid sitemap.
 * 
 * Features:
 * - Scans all niche folders for .html files
 * - Excludes specified directories (build artifacts, config, etc.)
 * - Generates proper GitHub Pages URLs
 * - Treats index.html as the root of each folder
 * - Sorts URLs alphabetically
 * - Adds proper sitemap metadata (lastmod, changefreq, priority)
 */

import { readdir, writeFile } from 'fs/promises';
import { join, sep } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const REPO_ROOT = join(__dirname, '..');
const BASE_URL = 'https://sc-connections.github.io/Top-10';
const SITEMAP_PATH = join(REPO_ROOT, 'sitemap.xml');

// Directories to exclude from scanning
const EXCLUDE_DIRS = new Set([
  '.git',
  '.github',
  'assets',
  'data',
  'examples',
  'generated-pages',
  'node_modules',
  'scraper',
  'scripts',
  'templates',
  'test'
]);

/**
 * Recursively find all HTML files in a directory
 * @param {string} dir - Directory to scan
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Promise<string[]>} Array of relative file paths
 */
async function findHtmlFiles(dir, baseDir = dir) {
  const files = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip excluded directories
        if (!EXCLUDE_DIRS.has(entry.name)) {
          const subFiles = await findHtmlFiles(fullPath, baseDir);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        // Get relative path from base directory
        const relativePath = fullPath.substring(baseDir.length + 1);
        files.push(relativePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * Convert file path to GitHub Pages URL
 * @param {string} filePath - Relative file path
 * @returns {string} Full URL
 */
function filePathToUrl(filePath) {
  // Convert Windows paths to forward slashes
  const normalizedPath = filePath.split(sep).join('/');
  
  // If the file is index.html, link to the directory
  if (normalizedPath.endsWith('/index.html')) {
    const dirPath = normalizedPath.substring(0, normalizedPath.length - 'index.html'.length);
    return `${BASE_URL}/${dirPath}`;
  }
  
  // For root index.html
  if (normalizedPath === 'index.html') {
    return `${BASE_URL}/`;
  }
  
  // For all other HTML files
  return `${BASE_URL}/${normalizedPath}`;
}

/**
 * Generate sitemap XML content
 * @param {string[]} urls - Array of URLs
 * @returns {string} Sitemap XML content
 */
function generateSitemapXml(urls) {
  const today = new Date().toISOString().split('T')[0];
  
  const urlEntries = urls.map(url => {
    return `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * Escape special XML characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Main function to generate sitemap
 */
async function generateSitemap() {
  console.log('Starting sitemap generation...');
  console.log(`Repository root: ${REPO_ROOT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Excluded directories: ${Array.from(EXCLUDE_DIRS).join(', ')}`);
  console.log('');
  
  try {
    // Find all HTML files
    console.log('Scanning for HTML files...');
    const htmlFiles = await findHtmlFiles(REPO_ROOT);
    console.log(`Found ${htmlFiles.length} HTML files`);
    
    // Convert to URLs and sort
    const urls = htmlFiles
      .map(filePathToUrl)
      .sort((a, b) => a.localeCompare(b));
    
    console.log(`Generated ${urls.length} URLs`);
    
    // Show some sample URLs
    if (urls.length > 0) {
      console.log('\nSample URLs:');
      urls.slice(0, 10).forEach(url => console.log(`  - ${url}`));
      if (urls.length > 10) {
        console.log(`  ... and ${urls.length - 10} more`);
      }
    }
    
    // Generate sitemap XML
    console.log('\nGenerating sitemap XML...');
    const sitemapXml = generateSitemapXml(urls);
    
    // Write to file
    await writeFile(SITEMAP_PATH, sitemapXml, 'utf8');
    console.log(`\n✓ Sitemap generated successfully: ${SITEMAP_PATH}`);
    console.log(`  Total URLs: ${urls.length}`);
    console.log(`  File size: ${(sitemapXml.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('\n✗ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the generator
generateSitemap();
