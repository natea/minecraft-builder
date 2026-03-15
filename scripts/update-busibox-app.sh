#!/bin/bash

# Script to update @jazzmind/busibox-app package
# Checks GitHub auth and ensures correct scopes before installing

set -e

echo "🔍 Checking GitHub CLI authentication..."

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first."
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo "⚠️  Not logged in to GitHub CLI. Logging in..."
    gh auth login --hostname github.com --scopes gist,read:org,repo,workflow,write:packages,read:packages
else
    # Check current scopes
    AUTH_STATUS=$(gh auth status 2>&1)
    
    # Check if read:packages scope is present
    if echo "$AUTH_STATUS" | grep -q "packages"; then
        echo "✅ GitHub CLI authenticated with packages scope"
    else
        echo "⚠️  Missing packages scope. Refreshing authentication..."
        gh auth refresh --hostname github.com --scopes gist,read:org,repo,workflow,write:packages,read:packages
    fi
fi

# Export token
export GITHUB_AUTH_TOKEN=$(gh auth token)

if [ -z "$GITHUB_AUTH_TOKEN" ]; then
    echo "❌ Failed to get GitHub token"
    exit 1
fi

echo "✅ GitHub token exported"
echo "📦 Installing @jazzmind/busibox-app@latest..."

# Install the package
npm install @jazzmind/busibox-app@latest

echo "✅ Update complete!"
