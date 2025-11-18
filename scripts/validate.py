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
    asin_occurrences = {}
    violations = []
    
    # Check all niche directories
    for niche_dir in Path(base_path).iterdir():
        if not niche_dir.is_dir() or niche_dir.name.startswith('.'):
            continue
            
        # Check index.html for ASINs
        index_file = niche_dir / 'index.html'
        if index_file.exists():
            content = index_file.read_text()
            # Find all ASINs in the HTML (pattern: data-asin or /dp/ASIN)
            asins = re.findall(r'data-asin="([A-Z0-9]{10})"', content)
            asins += re.findall(r'/dp/([A-Z0-9]{10})', content)
            
            for asin in asins:
                if asin not in asin_occurrences:
                    asin_occurrences[asin] = []
                asin_occurrences[asin].append(str(index_file))
    
    # Find duplicates
    for asin, files in asin_occurrences.items():
        if len(files) > 1:
            violations.append(f"  ❌ Duplicate ASIN {asin} found in: {', '.join(files)}")
    
    if violations:
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
