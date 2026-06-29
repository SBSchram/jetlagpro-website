# JetLagPro — Product facts (for humans and AI agents)

**Last updated:** 2026-06-28  
**Canonical URL:** https://jetlagpro.com/docs/PRODUCT.md  
**Short index:** https://jetlagpro.com/llms.txt

This document states verifiable facts about JetLagPro. Marketing copy on HTML pages may be shorter; when sources conflict, treat this file and `llms.txt` as current for product/platform/research questions.

---

## Product summary

| Field | Value |
|-------|--------|
| Name | JetLagPro |
| Purpose | Timed acupressure (chronoacupuncture) for jet lag — 12 horary points every ~2 hours aligned to **destination** local time |
| Primary app | Native **iOS** + **watchOS** (SwiftUI) |
| Website | https://jetlagpro.com — landing page, science content, live research paper, interactive demo |
| Contact | info@jetlagpro.com |
| iOS bundle ID | `com.jetlagpro.JetLagPro` |
| Minimum OS | iOS 18.2+, watchOS 11.2+ (see App Store listing when live) |

---

## Platforms

| Platform | Status | Notes |
|----------|--------|--------|
| **iOS** | App Store **approved** (June 2026) — manual public release pending | Source of truth for product and research behavior; TestFlight until store link is live |
| **watchOS** | Bundled with iOS app | Notifications and point UI mirror phone |
| **Android** | **Google Play 1.0.3** (June 2026) | Product travel guide only — no research consent, symptom survey, or `jetlagpro-research` uploads |
| **Web (jetlagpro.com)** | Live | Marketing + research; optional PWA for **site** offline pages; demo at `/demo/` |

**Deprecated:** Public **web survey** for research data — replaced by **native in-app survey** (`SurveyView` in iOS app). Do not document or link to a web survey flow.

---

## Distribution & pricing

| Item | Detail |
|------|--------|
| Research phase price | **Free** |
| App Store | **Approved** June 2026 — public URL on homepage `#download` when released |
| TestFlight (beta) | https://testflight.apple.com/join/YZc7jzJT — valid until App Store link is live |
| Google Play (Android) | https://play.google.com/store/apps/details?id=com.jetlagpro.android — product guide only; introductory free period |
| Future monetization | Planned after research publication (freemium IAP); not active during research phase |

---

## Research program

| Item | Detail |
|------|--------|
| Design | Prospective observational cohort |
| Pre-registration | OSF https://osf.io/jm4w7 |
| Outcome instrument | Streamlined post-travel survey based on **Liverpool Jet Lag Questionnaire** core domains (7 in-app sliders + optional comment) |
| Survey delivery | **In-app only** — fires ~1–2 days after trip end; no Safari handoff |
| Consent | In-app research consent card; uploads optional until granted |
| Adherence analysis | Primary strata from points marked stimulated (≥2 points for survey eligibility) |
| Live results | https://jetlagpro.com/research-paper.html (Firestore-backed chart) |

### Limitations (state plainly to users and agents)

- Observational; no placebo arm
- Self-selected travelers; self-reported outcomes
- Not a claim of FDA/medical-device efficacy

---

## Data & privacy

| Item | Detail |
|------|--------|
| Privacy policy | https://jetlagpro.com/privacy.html |
| Storage | Google Firebase Firestore (anonymous trip/survey documents) |
| Trip ID integrity | HMAC-signed IDs — see `DATA-INTEGRITY-IMPLEMENTATION.md` |
| Audit | Immutable append-only log in Google Cloud Storage |
| PII | No name, email, or account required for research uploads |

---

## Key URLs

| Resource | URL |
|----------|-----|
| Home | https://jetlagpro.com/ |
| Research paper | https://jetlagpro.com/research-paper.html |
| Privacy | https://jetlagpro.com/privacy.html |
| Terms | https://jetlagpro.com/terms.html |
| Data integrity doc | https://jetlagpro.com/DATA-INTEGRITY-IMPLEMENTATION.md |
| Interactive demo | https://jetlagpro.com/demo/ |
| OSF registration | https://osf.io/jm4w7 |

---

## Website deployment notes (operators)

- **Cache busting:** Bump `?v=` on CSS, JS, and image references when deploying content changes (see `DEVELOPER_GUIDE` in JetLagPro repo → Operational procedures).
- **Email:** Public contact `info@jetlagpro.com` — see `docs/EMAIL_SETUP.md` in this repo.

---

## Changelog for this document

- **2026-05-25:** Created for AI-agent readability; removed legacy web-survey references; clarified iOS primary / Android RN roadmap.
