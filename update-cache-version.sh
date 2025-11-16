#!/bin/bash

# JetLagPro Website Cache Busting Script
# This script updates all static asset version parameters to force fresh downloads
# Usage: ./update-cache-version.sh [custom_version]
# If no version provided, uses current timestamp

set -e  # Exit on any error

# Generate version (timestamp or custom)
if [ -n "$1" ]; then
    VERSION="$1"
    echo "Using custom version: $VERSION"
else
    VERSION=$(date +"%Y%m%d%H%M%S")
    echo "Generated timestamp version: $VERSION"
fi

echo "Updating cache version to: $VERSION"

# Update head-template.html (affects all pages via DRY approach)
echo "Updating head-template.html..."
sed -i '' "s/\(\.png\?\)v=[^\"&>]*/\1v=$VERSION/g" head-template.html
sed -i '' "s/\(\.json\?\)v=[^\"&>]*/\1v=$VERSION/g" head-template.html

# Update all HTML files in root directory
echo "Updating root HTML files..."
sed -i '' "s/\(styles\.css\?\)v=[^\"&>]*/\1v=$VERSION/g" *.html
sed -i '' "s/\(js\/components\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" *.html
sed -i '' "s/\(js\/translate\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" *.html
sed -i '' "s/\(survey\.css\?\)v=[^\"&>]*/\1v=$VERSION/g" *.html
sed -i '' "s/\(survey\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" *.html
sed -i '' "s/\(notifications\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" *.html
sed -i '' "s/\(load-common-head\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" *.html

# Update blog directory (with ../ paths)
if [ -d "blog" ]; then
    echo "Updating blog HTML files..."
    sed -i '' "s/\(\.\.\/styles\.css\?\)v=[^\"&>]*/\1v=$VERSION/g" blog/*.html
    sed -i '' "s/\(\.\.\/js\/components\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" blog/*.html
    sed -i '' "s/\(\.\.\/js\/translate\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" blog/*.html
    sed -i '' "s/\(\.\.\/load-common-head\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" blog/*.html
fi

# Update demo directory (with ../ paths)
if [ -d "demo" ]; then
    echo "Updating demo HTML files..."
    sed -i '' "s/\(\.\.\/styles\.css\?\)v=[^\"&>]*/\1v=$VERSION/g" demo/*.html
    sed -i '' "s/\(\.\.\/js\/components\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" demo/*.html
    sed -i '' "s/\(\.\.\/js\/translate\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" demo/*.html
    sed -i '' "s/\(\.\.\/load-common-head\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" demo/*.html
fi

# Update reviewers directory (with ../ paths for parent assets, local paths for reviewer assets)
if [ -d "reviewers" ]; then
    echo "Updating reviewers HTML files..."
    # Update load-common-head.js (from parent directory)
    sed -i '' "s/\(\.\.\/load-common-head\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
    # Update load-nav.js (local reviewer navigation loader)
    sed -i '' "s/\(load-nav\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
    # Update firebase-service.js (from parent assets)
    sed -i '' "s/\(\.\.\/assets\/js\/firebase-service\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
    # Update reviewer-specific CSS files (local paths)
    sed -i '' "s/\(assets\/css\/reviewers\.css\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
    sed -i '' "s/\(assets\/css\/audit-log\.css\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
    sed -i '' "s/\(assets\/css\/analytics\.css\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
    # Update reviewer-specific JS files (local paths)
    sed -i '' "s/\(assets\/js\/audit-log\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
    sed -i '' "s/\(assets\/js\/analytics\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
    sed -i '' "s/\(assets\/js\/charts\.js\?\)v=[^\"&>]*/\1v=$VERSION/g" reviewers/*.html
fi

# Clean up any double version parameters (safety check)
echo "Cleaning up any duplicate version parameters..."
sed -i '' "s/\?v=$VERSION\?v=$VERSION/?v=$VERSION/g" *.html blog/*.html demo/*.html reviewers/*.html 2>/dev/null || true

echo "✅ Cache version updated to: $VERSION"
echo ""
echo "Files updated:"
echo "- head-template.html (affects ALL pages via DRY - includes meta tags, Cloudflare localStorage version, asset versions)"
echo "- All *.html files in root directory"
echo "- All blog/*.html files"
echo "- All demo/*.html files"
echo "- All reviewers/*.html files (including reviewer-specific CSS/JS assets)"
echo ""
echo "Next steps:"
echo "1. Test the website to ensure all assets load correctly"
echo "2. Commit and push changes: git add . && git commit -m 'Update cache version to $VERSION' && git push"
echo "3. Verify fresh content loads in browser (try hard refresh: Cmd+Shift+R)"
