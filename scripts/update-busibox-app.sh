#!/bin/bash

# Script to update @jazzmind/busibox-app package
# The package is public on npmjs.org - no authentication required

set -e

echo "📦 Installing @jazzmind/busibox-app@latest..."

npm install @jazzmind/busibox-app@latest

echo "✅ Update complete!"
