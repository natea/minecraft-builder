#!/bin/bash

# Script to link local busibox-app for development
# Run this when developing busibox-app alongside your app

set -e

BUSIBOX_APP_PATH="${1:-../busibox-app}"

echo "🔗 Linking local busibox-app from $BUSIBOX_APP_PATH..."

# Check if path exists
if [ ! -d "$BUSIBOX_APP_PATH" ]; then
    echo "❌ Directory not found: $BUSIBOX_APP_PATH"
    echo "Usage: ./scripts/link-local-busibox.sh [path-to-busibox-app]"
    echo "Default path: ../busibox-app"
    exit 1
fi

# Check if it's a valid busibox-app directory
if [ ! -f "$BUSIBOX_APP_PATH/package.json" ]; then
    echo "❌ No package.json found in $BUSIBOX_APP_PATH"
    exit 1
fi

# Get absolute path
BUSIBOX_APP_PATH=$(cd "$BUSIBOX_APP_PATH" && pwd)

echo "📁 Using path: $BUSIBOX_APP_PATH"

# Build busibox-app first
echo "🔨 Building busibox-app..."
(cd "$BUSIBOX_APP_PATH" && npm run build)

# Create npm link in busibox-app
echo "🔗 Creating npm link in busibox-app..."
(cd "$BUSIBOX_APP_PATH" && npm link)

# Link in this project
echo "🔗 Linking busibox-app in this project..."
npm link @jazzmind/busibox-app

echo "✅ Local busibox-app linked successfully!"
echo ""
echo "To unlink, run: ./scripts/unlink-local-busibox.sh"
