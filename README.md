# JetLagPro Website

This is the official website for JetLagPro, hosted on GitHub Pages.

## About

JetLagPro is an iOS app that uses traditional Chinese acupressure techniques to help travelers overcome jet lag naturally. This website serves as the landing page and provides information about the app's features and benefits.

## Local Development

To run this website locally:

1. Clone the repository
2. Open `index.html` in your web browser
3. Or use a local server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

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

## File Structure

- `index.html` - Main landing page
- `styles.css` - CSS styles
- `CNAME` - Custom domain configuration
- `README.md` - This file

## Contributing

To make changes to the website:

1. Make your changes locally
2. Test the changes
3. Commit and push to the main branch
4. GitHub Pages will automatically deploy the changes

## Contact

For questions about the website, contact the development team. 