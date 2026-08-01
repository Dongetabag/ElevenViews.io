#!/bin/bash
# Eleven Views Platform - Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying Eleven Views Platform..."

# Build the app
echo "📦 Building..."
npm run build

# Secret gate — the bundle in dist/ is served to browsers, so a credential in it
# is a published credential. ELE-2620: a live Discord webhook and three dead API
# keys shipped this way. Refuse to upload rather than publish another one.
echo "🔒 Scanning bundle for credentials..."
if command -v ev-secret-scan >/dev/null 2>&1; then
  if ! ev-secret-scan dist/ --json /tmp/elevenviews-deploy-scan.json; then
    echo ""
    echo "❌ Deploy blocked: dist/ contains credential-shaped strings."
    echo "   Report: /tmp/elevenviews-deploy-scan.json"
    echo "   Fix the source (never a VITE_-prefixed secret) and rebuild."
    exit 1
  fi
  echo "✅ Bundle clean."
else
  echo "❌ Deploy blocked: ev-secret-scan not found and this gate is mandatory."
  echo "   Install it from Dongetabag/eleven-views-desk before deploying."
  exit 1
fi

# Deploy to server (portal subdirectory only)
echo "📤 Uploading to elevenviews.io/portal/..."
ssh -p 65002 -i ~/.ssh/elevenviews_deploy u496141090@92.112.187.37 "mkdir -p ~/domains/elevenviews.io/public_html/portal"
scp -P 65002 -i ~/.ssh/elevenviews_deploy -r dist/* u496141090@92.112.187.37:~/domains/elevenviews.io/public_html/portal/

echo "✅ Deployment complete!"
echo "🌐 Live at: https://elevenviews.io"
