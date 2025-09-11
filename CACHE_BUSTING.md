# JetLagPro Website Cache Busting System

## Overview

The JetLagPro website uses a comprehensive cache busting system to ensure users always get fresh content, preventing stale data issues that were affecting the user experience.

## Architecture

### DRY Approach
- **Single Source of Truth**: All cache control headers are defined in `head-template.html`
- **Automatic Distribution**: All HTML files include `load-common-head.js` which loads the common headers
- **Version-Based Asset Loading**: All static assets (CSS, JS, images) use version parameters

### Cache Control Strategy
1. **HTML Files**: `no-cache, no-store, must-revalidate` headers prevent HTML caching
2. **Static Assets**: Version parameters (`?v=TIMESTAMP`) force fresh downloads when changed
3. **Comprehensive Coverage**: All file types (CSS, JS, images, manifests) are versioned

## Usage

### Automatic Cache Busting (Recommended)
```bash
./update-cache-version.sh
```
This generates a timestamp-based version and updates all files automatically.

### Custom Version
```bash
./update-cache-version.sh "v2.1.0"
```
Use a custom version string instead of timestamp.

### Manual Testing
After running the script:
1. Test website functionality
2. Check browser dev tools to confirm new version parameters
3. Verify hard refresh (`Cmd+Shift+R`) loads fresh content

## Files Affected

### Automatically Updated by Script
- `head-template.html` - Core cache headers and asset versions
- All `*.html` files in root directory
- All `blog/*.html` files (with `../` path handling)
- All `demo/*.html` files (with `../` path handling)

### Asset Types Versioned
- `styles.css` - Main stylesheet
- `js/components.js` - Header/footer components
- `js/translate.js` - Google Translate integration
- `survey.css` - Survey-specific styles
- `survey.js` - Survey functionality
- `notifications.js` - Push notification service
- `load-common-head.js` - Common head loader
- `assets/images/app-icon.png` - App icons
- `manifest.json` - PWA manifest

## Technical Details

### Cache Headers Applied
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

### Version Parameter Format
- **Timestamp**: `?v=20250910221020` (YYYYMMDDHHMMSS)
- **Custom**: `?v=v2.1.0` (any string)

### Browser Compatibility
- ✅ Chrome, Safari, Firefox, Edge
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ HTTP/1.0 and HTTP/1.1 compatibility

## Troubleshooting

### Still Seeing Stale Content?
1. **Hard Refresh**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)
2. **Clear Browser Cache**: Manual cache clearing in browser settings
3. **Check Version Parameters**: Verify assets have correct `?v=` parameters
4. **Service Worker**: Check if service worker is caching (should be disabled)

### Script Issues
- **Permission Denied**: Run `chmod +x update-cache-version.sh`
- **File Not Found**: Ensure you're in the website root directory
- **Sed Errors**: Script is macOS-compatible; Linux users may need to modify `sed -i ''` to `sed -i`

## Best Practices

1. **Always run script before major deployments**
2. **Test functionality after version updates**
3. **Commit version changes with descriptive messages**
4. **Document version updates in deployment notes**
5. **Monitor user reports of stale content issues**

## Future Maintenance

To add new static assets to the cache busting system:
1. Add the asset pattern to `update-cache-version.sh`
2. Ensure the asset is loaded with a version parameter in HTML
3. Test that the script properly updates the new asset

## Related Files
- `update-cache-version.sh` - Main cache busting script
- `head-template.html` - Core cache control headers
- `load-common-head.js` - Distributes common headers to all pages
