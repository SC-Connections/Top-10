#!/usr/bin/env python3
"""
Repository Factory Script
Creates and seeds new GitHub repositories for each niche defined in niches.yml
Each repo is a standalone niche site with its own build/deploy workflow
"""

import os
import sys
import json
import yaml
import requests
import subprocess
import shutil
import time
from pathlib import Path

# Configuration from environment variables
GH_TOKEN = os.environ.get('GH_TOKEN', '')
ORG = os.environ.get('ORG', 'SC-Connections')
TEMPLATE_DIR = os.environ.get('TEMPLATE_DIR', 'template')
NICHES_FILE = os.environ.get('NICHES_FILE', 'niches/niches.yml')

# GitHub API base URL
API_BASE = 'https://api.github.com'

# Git configuration for commits
GIT_USER_NAME = 'github-actions[bot]'
GIT_USER_EMAIL = '41898282+github-actions[bot]@users.noreply.github.com'


def load_niches():
    """Load niches from YAML file"""
    if not os.path.exists(NICHES_FILE):
        print(f"❌ ERROR: Niches file not found: {NICHES_FILE}")
        sys.exit(1)
    
    with open(NICHES_FILE, 'r') as f:
        data = yaml.safe_load(f)
    
    niches = data.get('niches', [])
    if not niches:
        print("⚠️  WARNING: No niches found in file")
        return []
    
    print(f"✅ Loaded {len(niches)} niche(s) from {NICHES_FILE}")
    return niches


def check_repo_exists(repo_name):
    """Check if a repository already exists under the organization"""
    url = f"{API_BASE}/repos/{ORG}/{repo_name}"
    headers = {
        'Authorization': f'token {GH_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    response = requests.get(url, headers=headers)
    return response.status_code == 200


def create_repo(repo_name):
    """Create a new public repository under the organization"""
    url = f"{API_BASE}/orgs/{ORG}/repos"
    headers = {
        'Authorization': f'token {GH_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    data = {
        'name': repo_name,
        'description': f'Automated niche site for {repo_name.replace("top10-", "").replace("-", " ").title()}',
        'homepage': f'https://{ORG.lower()}.github.io/{repo_name}/',
        'private': False,
        'has_issues': True,
        'has_projects': False,
        'has_wiki': False,
        'auto_init': False  # We'll push our own initial commit
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        print(f"✅ Created repository: {ORG}/{repo_name}")
        return response.json()
    else:
        print(f"❌ Failed to create repository: {response.status_code}")
        print(f"   Response: {response.text}")
        sys.exit(1)


def enable_github_pages(repo_name):
    """Enable GitHub Pages for the repository"""
    url = f"{API_BASE}/repos/{ORG}/{repo_name}/pages"
    headers = {
        'Authorization': f'token {GH_TOKEN}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    data = {
        'source': {
            'branch': 'main',
            'path': '/'
        },
        'build_type': 'workflow'  # Use GitHub Actions workflow for deployment
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code in [201, 409]:  # 201 = created, 409 = already exists
        print(f"✅ GitHub Pages enabled for {repo_name}")
        return True
    else:
        print(f"⚠️  Could not enable GitHub Pages: {response.status_code}")
        print(f"   Response: {response.text}")
        print(f"   Note: You may need to enable Pages manually in repo settings")
        return False


def clone_and_populate_repo(repo_name, niche_data):
    """Clone empty repo, copy template files, inject config, and push"""
    
    # Create temporary directory for cloning
    temp_dir = f'/tmp/repo-factory-{repo_name}'
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    
    # Clone URL with authentication
    clone_url = f'https://{GH_TOKEN}@github.com/{ORG}/{repo_name}.git'
    
    print(f"📦 Cloning {repo_name}...")
    
    # Initialize new git repo (since we used auto_init=False)
    os.makedirs(temp_dir)
    os.chdir(temp_dir)
    
    subprocess.run(['git', 'init'], check=True, capture_output=True)
    subprocess.run(['git', 'remote', 'add', 'origin', clone_url], check=True, capture_output=True)
    
    # Configure git user
    subprocess.run(['git', 'config', 'user.name', GIT_USER_NAME], check=True, capture_output=True)
    subprocess.run(['git', 'config', 'user.email', GIT_USER_EMAIL], check=True, capture_output=True)
    
    print(f"📁 Copying template files...")
    
    # Get the original working directory (where script was run from)
    original_dir = os.environ.get('GITHUB_WORKSPACE') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_path = os.path.join(original_dir, TEMPLATE_DIR)
    
    if not os.path.exists(template_path):
        print(f"❌ Template directory not found: {template_path}")
        sys.exit(1)
    
    # Copy all files from template directory
    for item in os.listdir(template_path):
        src = os.path.join(template_path, item)
        dst = os.path.join(temp_dir, item)
        
        if os.path.isdir(src):
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(src, dst)
    
    print(f"💉 Injecting niche configuration...")
    
    # Create niche.json with niche-specific configuration
    niche_config = {
        'slug': niche_data['slug'],
        'title': niche_data['title'],
        'repository': f'{ORG}/{repo_name}',
        'homepage': f'https://{ORG.lower()}.github.io/{repo_name}/',
        'generated_at': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
    }
    
    with open('niche.json', 'w') as f:
        json.dump(niche_config, f, indent=2)
    
    # Generate README.md from template
    readme_template_path = os.path.join(temp_dir, 'README.template.md')
    if os.path.exists(readme_template_path):
        with open(readme_template_path, 'r') as f:
            readme_content = f.read()
        
        # Replace placeholders
        readme_content = readme_content.replace('{{NICHE_TITLE}}', niche_data['title'])
        readme_content = readme_content.replace('{{NICHE_SLUG}}', niche_data['slug'])
        
        with open('README.md', 'w') as f:
            f.write(readme_content)
        
        # Remove the template file
        os.remove(readme_template_path)
        print(f"✅ Generated README.md from template")
    
    print(f"📝 Committing files...")
    
    # Add all files and commit
    subprocess.run(['git', 'add', '.'], check=True, capture_output=True)
    subprocess.run([
        'git', 'commit', '-m', 
        f'Initial commit: {niche_data["title"]} niche site template'
    ], check=True, capture_output=True)
    
    # Create main branch and push
    subprocess.run(['git', 'branch', '-M', 'main'], check=True, capture_output=True)
    
    print(f"🚀 Pushing to GitHub...")
    
    result = subprocess.run(['git', 'push', '-u', 'origin', 'main'], 
                          capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Failed to push to GitHub")
        print(f"   stdout: {result.stdout}")
        print(f"   stderr: {result.stderr}")
        sys.exit(1)
    
    print(f"✅ Successfully pushed initial commit to {repo_name}")
    
    # Clean up
    os.chdir(original_dir)
    shutil.rmtree(temp_dir)


def spawn_repo(niche_data):
    """Main function to spawn a single repository"""
    slug = niche_data['slug']
    title = niche_data['title']
    repo_name = f'top10-{slug}'
    
    print(f"\n{'='*60}")
    print(f"🏭 Processing niche: {title}")
    print(f"   Repository: {ORG}/{repo_name}")
    print(f"{'='*60}\n")
    
    # Check if repo already exists
    if check_repo_exists(repo_name):
        print(f"⏭️  Repository {repo_name} already exists, skipping...")
        return
    
    # Create the repository
    create_repo(repo_name)
    
    # Wait a moment for GitHub to fully create the repo
    time.sleep(2)
    
    # Clone, populate, and push
    clone_and_populate_repo(repo_name, niche_data)
    
    # Enable GitHub Pages
    enable_github_pages(repo_name)
    
    print(f"\n✅ Successfully spawned: {ORG}/{repo_name}")
    print(f"   URL: https://{ORG.lower()}.github.io/{repo_name}/")


def main():
    """Main execution function"""
    print("🏭 Repository Factory Starting...\n")
    
    # Validate environment
    if not GH_TOKEN:
        print("❌ ERROR: GH_TOKEN environment variable not set")
        print("   This token is required for GitHub API access")
        sys.exit(1)
    
    print(f"✅ Configuration:")
    print(f"   Organization: {ORG}")
    print(f"   Template Dir: {TEMPLATE_DIR}")
    print(f"   Niches File: {NICHES_FILE}")
    print()
    
    # Load niches
    niches = load_niches()
    
    if not niches:
        print("✅ No niches to process")
        return
    
    # Process each niche
    success_count = 0
    error_count = 0
    
    for niche in niches:
        try:
            spawn_repo(niche)
            success_count += 1
        except Exception as e:
            print(f"❌ ERROR processing {niche.get('slug', 'unknown')}: {str(e)}")
            error_count += 1
    
    # Summary
    print(f"\n{'='*60}")
    print(f"🏁 Repository Factory Complete")
    print(f"{'='*60}")
    print(f"✅ Successfully spawned: {success_count}")
    print(f"❌ Errors: {error_count}")
    print()
    
    if error_count > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
