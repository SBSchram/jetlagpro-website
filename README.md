# JetLagPro Website

Official website for [JetLagPro](https://jetlagpro.com), hosted on GitHub Pages at **jetlagpro.com**.

## About

JetLagPro is a native **iOS + watchOS** app that uses timed acupressure (chronoacupuncture) to help travelers adjust to new time zones. This repository is the **marketing and research site** — not the app source code.

### What this site provides

- Landing page, science content, and interactive demo
- Live [research paper](https://jetlagpro.com/research-paper.html) with Firestore-backed results
- Privacy, terms, and data-integrity documentation
- Download links: [App Store (iOS 1.1)](https://apps.apple.com/us/app/jetlagpro/id6748569048) and [Google Play (Android)](https://play.google.com/store/apps/details?id=com.jetlagpro.android); optional [TestFlight beta](https://testflight.apple.com/join/YZc7jzJT)

### Research & data

- **In-app survey only** (no public web survey)
- Anonymous Firebase uploads with HMAC trip IDs and GCS audit logging
- Pre-registered at OSF: https://osf.io/jm4w7

### For AI agents

- **`llms.txt`** — short machine-readable product summary
- **`docs/PRODUCT.md`** — verifiable facts (platforms, pricing, research, URLs)
- **`docs/AGENTS.md`** — reading order for agents

## Local development

```bash
python -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000`. Edit HTML/CSS/JS directly.

## Deployment

Pushes to `main` deploy to GitHub Pages. Custom domain: **jetlagpro.com** (`CNAME`).

**Cache busting:** Bump `?v=` on CSS/JS/image links when deploying asset changes.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Canonical product facts |
| [llms.txt](llms.txt) | Agent index |
| [CHANGELOG.md](CHANGELOG.md) | Site version history |
| [DATA-INTEGRITY-IMPLEMENTATION.md](DATA-INTEGRITY-IMPLEMENTATION.md) | Security architecture |

## Contact

info@jetlagpro.com
