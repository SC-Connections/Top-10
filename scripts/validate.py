#!/usr/bin/env python3
"""
Validation script for generated sites
Checks for:
- Duplicate ASINs
- Blank brand fields
- Missing alt text
Exits with non-zero code on violation
"""

import sys
import os
import json
import re
from pathlib import Path
from html.parser import HTMLParser

class ImageAltChecker(HTMLParser):
    """HTML parser to check for images without alt text"""
    def __init__(self):
        super().__init__()
        self.missing_alt_images = []
        
    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            attrs_dict = dict(attrs)
            if 'alt' not in attrs_dict or not attrs_dict['alt'].strip():
                src = attrs_dict.get('src', 'unknown')
                self.missing_alt_images.append(src)

def check_duplicate_asins(base_path):
    """Check for duplicate ASINs across all generated sites"""
    print("📋 Checking for duplicate ASINs...")
    violations = []
    
    # Check all niche directories
    for niche_dir in Path(base_path).iterdir():
        if not niche_dir.is_dir() or niche_dir.name.startswith('.'):
            continue
            
        # Check index.html for ASINs
        index_file = niche_dir / 'index.html'
        if index_file.exists():
            content = index_file.read_text()
            
            # Find all unique ASINs and count occurrences of product cards (not all mentions)
            # Look for product-card div with data-rank to count actual product duplicates
            product_cards = re.findall(r'<div class="product-card"[^>]*data-rank="(\d+)"[^>]*id="product-\d+"[^>]*>', content)
            asins_in_cards = []
            
            # Extract ASINs from blog links in product cards (more reliable than dp links which appear everywhere)
            card_sections = re.findall(r'<div class="product-card".*?</div>\s*</div>', content, re.DOTALL)
            for card in card_sections:
                # Find ASIN from blog link
                blog_match = re.search(r'blog/([A-Z0-9]{10})\.html', card)
                if blog_match:
                    asins_in_cards.append(blog_match.group(1))
            
            # Check for duplicates in the card list
            seen_asins = {}
            for asin in asins_in_cards:
                if asin in seen_asins:
                    violations.append(f"  ❌ Duplicate ASIN {asin} found in {index_file} (appears {asins_in_cards.count(asin)} times as product card)")
                    seen_asins[asin] = seen_asins[asin] + 1
                else:
                    seen_asins[asin] = 1
    
    if violations:
        # Remove duplicate violation messages
        violations = list(set(violations))
        print(f"❌ Found {len(violations)} duplicate ASIN violations:")
        for v in violations:
            print(v)
        return False
    else:
        print("✅ No duplicate ASINs found")
        return True

def check_blank_brands(base_path):
    """Check for products with blank brand fields"""
    print("\n📋 Checking for blank brand fields...")
    violations = []
    
    # Check data files for brand information
    data_dir = Path(base_path) / 'data'
    if data_dir.exists():
        for data_file in data_dir.glob('*.json'):
            if data_file.name in ['prices.json', 'reviews.json']:
                continue
            try:
                data = json.loads(data_file.read_text())
                # Check if this is an API response with products
                if isinstance(data, dict) and 'data' in data:
                    products = data.get('data', {}).get('results', [])
                    for product in products:
                        brand = product.get('brand', None)
                        if brand is None or brand == '':
                            asin = product.get('asin', 'unknown')
                            violations.append(f"  ❌ Product {asin} in {data_file.name} has blank brand field")
            except json.JSONDecodeError:
                pass
    
    # Check src/data/products.json if it exists
    products_json = Path(base_path) / 'src' / 'data' / 'products.json'
    if products_json.exists():
        try:
            data = json.loads(products_json.read_text())
            for niche, products in data.items():
                for product in products:
                    brand = product.get('brand', None)
                    if brand is None or brand == '':
                        asin = product.get('asin', 'unknown')
                        violations.append(f"  ❌ Product {asin} in {niche} has blank brand field")
        except json.JSONDecodeError:
            pass
    
    if violations:
        print(f"❌ Found {len(violations)} blank brand violations:")
        for v in violations:
            print(v)
        return False
    else:
        print("✅ No blank brand fields found")
        return True

def check_missing_alt_text(base_path):
    """Check for images without alt text"""
    print("\n📋 Checking for missing alt text...")
    violations = []
    
    # Check all HTML files
    for niche_dir in Path(base_path).iterdir():
        if not niche_dir.is_dir() or niche_dir.name.startswith('.'):
            continue
            
        # Check index.html
        index_file = niche_dir / 'index.html'
        if index_file.exists():
            parser = ImageAltChecker()
            parser.feed(index_file.read_text())
            if parser.missing_alt_images:
                violations.append(f"  ❌ {index_file}: {len(parser.missing_alt_images)} images without alt text")
        
        # Check blog pages
        blog_dir = niche_dir / 'blog'
        if blog_dir.exists():
            for blog_file in blog_dir.glob('*.html'):
                parser = ImageAltChecker()
                parser.feed(blog_file.read_text())
                if parser.missing_alt_images:
                    violations.append(f"  ❌ {blog_file}: {len(parser.missing_alt_images)} images without alt text")
    
    if violations:
        print(f"❌ Found {len(violations)} files with missing alt text:")
        for v in violations:
            print(v)
        return False
    else:
        print("✅ All images have alt text")
        return True

def main():
    """Main validation function"""
    print("🔍 Starting validation checks...\n")
    
    # Get base path (repository root)
    base_path = Path(__file__).parent.parent
    
    # Run all checks
    checks_passed = True
    checks_passed &= check_duplicate_asins(base_path)
    checks_passed &= check_blank_brands(base_path)
    checks_passed &= check_missing_alt_text(base_path)
    
    print("\n" + "=" * 60)
    if checks_passed:
        print("✅ All validation checks passed!")
        print("=" * 60)
        sys.exit(0)
    else:
        print("❌ Validation failed - please fix the violations above")
        print("=" * 60)
        sys.exit(1)

if __name__ == '__main__':
    main()
