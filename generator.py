#!/usr/bin/env python3
"""
Multi-Site Static Generator for Amazon Affiliate Sites
Generates unlimited niche sites using RapidAPI Amazon data
"""

import os
import csv
import json
import logging
import time
from pathlib import Path
from slugify import slugify
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY', '')
RAPIDAPI_HOST = 'amazon-real-time-api.p.rapidapi.com'
AFFILIATE_TAG = 'scconnec0d-20'
NICHES_FILE = 'niches.csv'
TEMPLATE_FILE = 'template.html'
OUTPUT_DIR = 'sites'
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds


def load_template():
    """Load the HTML template"""
    try:
        with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Template file not found: {TEMPLATE_FILE}")
        raise


def read_niches():
    """Read niches from CSV file"""
    niches = []
    try:
        with open(NICHES_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('niche') and row.get('keyword'):
                    niches.append(row)
        logger.info(f"Loaded {len(niches)} niches from {NICHES_FILE}")
        return niches
    except FileNotFoundError:
        logger.error(f"Niches file not found: {NICHES_FILE}")
        raise
    except Exception as e:
        logger.error(f"Error reading niches file: {e}")
        raise


def call_api(endpoint, params, retry_count=0):
    """Make API call with error handling and retries"""
    url = f"https://{RAPIDAPI_HOST}/{endpoint}"
    headers = {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        if retry_count < MAX_RETRIES:
            logger.warning(f"API call failed, retrying ({retry_count + 1}/{MAX_RETRIES}): {e}")
            time.sleep(RETRY_DELAY)
            return call_api(endpoint, params, retry_count + 1)
        else:
            logger.error(f"API call failed after {MAX_RETRIES} retries: {e}")
            return None


def search_products(keyword, limit=10):
    """Search for products by keyword"""
    logger.info(f"Searching for products: {keyword}")
    
    params = {
        'q': keyword,
        'domain': 'US',
        'limit': limit
    }
    
    data = call_api('search', params)
    
    if not data:
        logger.error(f"No data returned from search API for keyword: {keyword}")
        return []
    
    # Handle different response structures
    products = []
    if isinstance(data, dict):
        if 'data' in data:
            products = data['data'].get('products', [])
        elif 'products' in data:
            products = data['products']
    elif isinstance(data, list):
        products = data
    
    logger.info(f"Found {len(products)} products for {keyword}")
    return products


def get_product_details(asin):
    """Get detailed product information by ASIN"""
    logger.info(f"Fetching details for ASIN: {asin}")
    
    params = {
        'asin': asin,
        'domain': 'US'
    }
    
    data = call_api('product', params)
    
    if not data:
        logger.warning(f"No data returned for ASIN: {asin}")
        return None
    
    # Handle different response structures
    if isinstance(data, dict):
        if 'data' in data:
            return data['data']
        return data
    
    return None


def extract_product_info(product):
    """Extract required fields from product data"""
    try:
        # Handle different possible structures
        title = product.get('title') or product.get('product_title', '')
        image = product.get('image') or product.get('product_photo', '')
        asin = product.get('asin') or product.get('product_asin', '')
        
        # Price handling
        price_str = product.get('price') or product.get('product_price', '')
        if isinstance(price_str, str):
            price_str = price_str.replace('$', '').replace(',', '').strip()
        
        # Original price handling
        original_price_str = product.get('original_price') or product.get('product_original_price', '')
        if isinstance(original_price_str, str):
            original_price_str = original_price_str.replace('$', '').replace(',', '').strip()
        
        # Calculate discount
        discount = 0
        if original_price_str and price_str:
            try:
                price_val = float(price_str)
                original_val = float(original_price_str)
                if original_val > price_val:
                    discount = int(((original_val - price_val) / original_val) * 100)
            except (ValueError, ZeroDivisionError):
                pass
        
        # Build product info
        info = {
            'title': title,
            'image': image,
            'asin': asin,
            'price': f"${price_str}" if price_str else "Price not available",
            'original_price': f"${original_price_str}" if original_price_str else "",
            'discount': discount,
            'affiliate_link': f"https://www.amazon.com/dp/{asin}?tag={AFFILIATE_TAG}" if asin else ""
        }
        
        # Validate required fields
        if not info['title'] or not info['image'] or not info['asin']:
            logger.warning(f"Missing required fields for product: {asin}")
            return None
        
        return info
    except Exception as e:
        logger.error(f"Error extracting product info: {e}")
        return None


def build_product_html(product):
    """Build HTML for a single product"""
    html = f"""
    <div class="product">
        <h2>{product['title']}</h2>
        <img src="{product['image']}" alt="{product['title']}">
        <div class="price-info">
            <span class="price">{product['price']}</span>
            {f'<span class="old">{product["original_price"]}</span>' if product['original_price'] else ''}
            {f'<span class="discount">{product["discount"]}% off</span>' if product['discount'] > 0 else ''}
        </div>
        <a href="{product['affiliate_link']}" target="_blank" rel="noopener noreferrer">View on Amazon</a>
    </div>
    """
    return html


def generate_site(niche_data):
    """Generate a complete site for a niche"""
    niche = niche_data['niche']
    keyword = niche_data['keyword']
    slug = slugify(niche)
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Generating site for: {niche}")
    logger.info(f"Keyword: {keyword}")
    logger.info(f"Slug: {slug}")
    logger.info(f"{'='*60}")
    
    # Search for products
    products = search_products(keyword, limit=10)
    
    if not products:
        logger.error(f"No products found for {niche}, skipping...")
        return False
    
    # Get detailed information for each product
    product_details = []
    for product in products[:10]:  # Limit to 10
        asin = product.get('asin') or product.get('product_asin', '')
        if not asin:
            logger.warning("Product missing ASIN, skipping...")
            continue
        
        # For search results, we might already have enough info
        info = extract_product_info(product)
        
        # If missing details, fetch full product data
        if not info or not info.get('title') or not info.get('image'):
            logger.info(f"Fetching full details for {asin}")
            full_details = get_product_details(asin)
            if full_details:
                info = extract_product_info(full_details)
        
        if info:
            product_details.append(info)
            logger.info(f"Added product: {info['title'][:50]}...")
        else:
            logger.warning(f"Skipping product with ASIN: {asin}")
        
        # Rate limiting
        time.sleep(0.5)
    
    if not product_details:
        logger.error(f"No valid products found for {niche}, skipping...")
        return False
    
    logger.info(f"Successfully processed {len(product_details)} products")
    
    # Build products HTML
    products_html = '\n'.join([build_product_html(p) for p in product_details])
    
    # Load template
    template = load_template()
    
    # Replace placeholders
    html = template.replace('{{NICHE_TITLE}}', niche)
    html = html.replace('{{META_DESCRIPTION}}', 
                       f"Discover the best {niche.lower()} available on Amazon. "
                       f"Our expert-curated list features the top-rated products with detailed reviews, "
                       f"pricing, and direct purchase links. Updated daily with the latest deals.")
    html = html.replace('{{PRODUCTS}}', products_html)
    
    # Create output directory
    output_path = Path(OUTPUT_DIR) / slug
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Write HTML file
    output_file = output_path / 'index.html'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    logger.info(f"✅ Generated site: {output_file}")
    return True


def main():
    """Main execution function"""
    logger.info("🚀 Starting Multi-Site Static Generator")
    logger.info(f"Affiliate Tag: {AFFILIATE_TAG}")
    
    # Validate API key
    if not RAPIDAPI_KEY:
        logger.error("❌ ERROR: RAPIDAPI_KEY environment variable not set")
        logger.error("Please set RAPIDAPI_KEY before running the generator")
        return 1
    
    logger.info("✅ API key validated")
    
    # Create output directory
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    # Read niches
    try:
        niches = read_niches()
    except Exception as e:
        logger.error(f"Failed to read niches: {e}")
        return 1
    
    if not niches:
        logger.error("No niches found in CSV file")
        return 1
    
    # Generate sites
    success_count = 0
    failed_count = 0
    
    for niche_data in niches:
        try:
            if generate_site(niche_data):
                success_count += 1
            else:
                failed_count += 1
        except Exception as e:
            logger.error(f"Error generating site for {niche_data['niche']}: {e}")
            failed_count += 1
    
    # Summary
    logger.info(f"\n{'='*60}")
    logger.info("📊 Generation Summary")
    logger.info(f"{'='*60}")
    logger.info(f"✅ Successfully generated: {success_count} sites")
    logger.info(f"❌ Failed: {failed_count} sites")
    logger.info(f"📁 Output directory: {OUTPUT_DIR}")
    logger.info(f"{'='*60}\n")
    
    if success_count == 0:
        logger.error("No sites were generated successfully")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())
