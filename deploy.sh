#!/bin/bash
# Eleven Views Platform - Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying Eleven Views Platform..."

# Build the app
echo "📦 Building..."
npm run build

# Deploy to server
echo "📤 Uploading to elevenviews.io..."
scp -P 65002 -i ~/.ssh/elevenviews_deploy -r dist/* u496141090@92.112.187.37:~/domains/elevenviews.io/public_html/

echo "✅ Deployment complete!"
echo "🌐 Live at: https://elevenviews.io"
