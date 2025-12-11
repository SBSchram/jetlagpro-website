# JetLagPro Website

This is the official website for JetLagPro, hosted on GitHub Pages.

## About

JetLagPro is an iOS app that uses traditional Chinese acupressure techniques to help travelers overcome jet lag naturally. This website serves as the landing page, research documentation, and data collection platform.

### Key Features
- **Research Platform:** Clinical trial data collection via web surveys
- **Data Integrity:** Immutable audit logging with independent verification
- **Security:** HMAC-signed trip IDs prevent data fabrication
- **Transparency:** Public audit logs and verification tools

## Local Development

To run this website locally:

1. Clone the repository
2. Start the development server:
   ```bash
   ./dev-server.sh
   ```
   Or use a simple HTTP server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```
3. Open `http://localhost:8000` in your browser

**Editing:** Edit HTML files directly (no conversion needed). Changes appear on refresh.

## Deployment

This website is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

### Custom Domain Setup

The website uses the custom domain `jetlagpro.com`. To configure:

1. In your GitHub repository settings, go to "Pages"
2. Under "Custom domain", enter `jetlagpro.com`
3. Save the settings
4. Update your DNS settings with your domain provider to point to GitHub Pages

### DNS Configuration

Add these records to your domain's DNS settings:

```
Type: CNAME
Name: @
Value: yourusername.github.io
```

## Documentation

- **[CHANGELOG.md](CHANGELOG.md)** - Version history and major changes
- **[DATA-INTEGRITY-IMPLEMENTATION.md](DATA-INTEGRITY-IMPLEMENTATION.md)** - Data security architecture
- **[Research Paper](https://jetlagpro.com/research-paper.html)** - Scientific background and methodology

## File Structure

### Website
- `index.html` - Main landing page
- `survey.html` - Post-trip survey
- `research-paper.html` - Scientific documentation
- `styles.css` - CSS styles
- `CNAME` - Custom domain configuration

### Backend
- `functions/` - Firebase Cloud Functions (audit logging, validation)
- `firestore.rules` - Firebase Security Rules
- `scripts/` - Verification and analysis tools

### Documentation
- `CHANGELOG.md` - Version history
- `DATA-INTEGRITY-IMPLEMENTATION.md` - Security architecture
- `README.md` - This file

## Contributing

To make changes to the website:

1. Make your changes locally
2. Test the changes
3. Commit and push to the main branch
4. GitHub Pages will automatically deploy the changes

## Contact

For questions about the website, contact the development team. 