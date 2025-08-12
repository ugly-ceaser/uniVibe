#!/bin/bash

# Dependency Version Lock Script
# This script ensures consistent dependency versions across all environments

set -e

echo "🔒 Locking dependency versions..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
REQUIRED_NODE_VERSION=$(cat .nvmrc)
CURRENT_NODE_VERSION=$(node --version | cut -d'v' -f2)

if [ "$CURRENT_NODE_VERSION" != "$REQUIRED_NODE_VERSION" ]; then
    echo "⚠️  Warning: Current Node.js version ($CURRENT_NODE_VERSION) differs from required version ($REQUIRED_NODE_VERSION)"
    echo "   Consider using nvm to switch to the correct version: nvm use"
fi

# Remove existing lock files
echo "🧹 Cleaning existing lock files..."
rm -f package-lock.json
rm -f yarn.lock

# Install dependencies with exact versions
echo "📦 Installing dependencies with exact versions..."
npm install --package-lock-only

# Verify the lock file was created
if [ ! -f "package-lock.json" ]; then
    echo "❌ Error: package-lock.json was not created"
    exit 1
fi

# Check for outdated packages
echo "🔍 Checking for outdated packages..."
OUTDATED=$(npm outdated --depth=0 2>/dev/null || true)

if [ -n "$OUTDATED" ]; then
    echo "⚠️  Found outdated packages:"
    echo "$OUTDATED"
    echo ""
    echo "Consider updating with: npm run deps:update"
else
    echo "✅ All packages are up to date"
fi

# Audit for security vulnerabilities
echo "🔒 Running security audit..."
npm audit --audit-level=moderate || {
    echo "⚠️  Security vulnerabilities found. Run 'npm run deps:fix' to fix them."
}

echo "✅ Dependency versions locked successfully!"
echo "📋 Summary:"
echo "   - package-lock.json created/updated"
echo "   - All dependencies locked to exact versions"
echo "   - Security audit completed"
echo ""
echo "💡 Next steps:"
echo "   1. Commit package-lock.json to version control"
echo "   2. Share the updated lock file with your team"
echo "   3. Use 'npm ci' instead of 'npm install' for consistent installs" 