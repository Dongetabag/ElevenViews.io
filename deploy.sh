#!/bin/bash
# Eleven Views Platform - Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying Eleven Views Platform..."

# Build the app
echo "📦 Building..."
npm run build

# Deploy to server (portal subdirectory only)
echo "📤 Uploading to elevenviews.io/portal/..."
ssh -p 65002 -i ~/.ssh/elevenviews_deploy u496141090@92.112.187.37 "mkdir -p ~/domains/elevenviews.io/public_html/portal"
scp -P 65002 -i ~/.ssh/elevenviews_deploy -r dist/* u496141090@92.112.187.37:~/domains/elevenviews.io/public_html/portal/

echo "✅ Deployment complete!"
echo "🌐 Live at: https://elevenviews.io"
