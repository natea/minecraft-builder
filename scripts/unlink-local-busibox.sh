#!/bin/bash

# Script to unlink local busibox-app and restore npm version

set -e

echo "🔗 Unlinking local busibox-app..."

# Unlink the package
npm unlink @jazzmind/busibox-app

# Reinstall from npm
echo "📦 Reinstalling @jazzmind/busibox-app from npm..."
npm install @jazzmind/busibox-app

echo "✅ Restored npm version of busibox-app"
