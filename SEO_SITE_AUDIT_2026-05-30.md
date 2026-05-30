# JetLagPro.com — Site Audit (Skill 04)

**Date:** 2026-05-30  
**URL:** https://jetlagpro.com  
**Platform:** Static HTML/CSS/JS, GitHub Pages, Cloudflare  
**Primary goals:** App download (TestFlight → App Store), research credibility, demo engagement  
**Audit method:** Live HTTP checks + repo source review (`jetlagpro-website`)

---

## Executive summary

The site has a **solid technical base** (HTTPS, live sitemap, canonicals on key pages, JSON-LD on homepage, `llms.txt` for AI clarity). The biggest gaps are **claim-risk in titles/meta**, an **incomplete sitemap**, **missing meta/canonical on several public pages**, and **thin indexable content** (blog cluster). Fixing the top three issues this week improves trust, compliance alignment, and crawl coverage without a redesign.

---

## Fix this week (highest impact)

### 1. Align homepage SEO copy with research / claim policy

**Issue:** Homepage title, meta description, and `meta keywords` use strong outcome language that conflicts with project policy (`llms.txt`: efficacy claims on marketing pages are aspirational; observational study in progress).

| Location | Current (problem) |
|----------|-------------------|
| `index.html` title | "Beat Jet Lag Naturally…" |
| Meta description | "Beat jet lag **in 2-3 days**…" |
| Meta keywords | includes "**jet lag cure**" |
| `science.html` title | "…**Beats** Jet Lag" |

**Why it matters:** Overclaiming hurts E-E-A-T for health content and creates App Store / research consistency risk.

**Fix:** Rewrite title + meta + keywords to informational framing, e.g. focus on *timed acupressure schedule*, *research-backed approach*, *free app during study* — not cure or fixed recovery time. Run Skill 03 for three title/description options before publishing.

**Files:** `index.html`, `science.html`, `travel-tips.html` (review "Proven" framing), `privacy.html` meta.

---

### 2. Expand and refresh `sitemap.xml`

**Issue:** Sitemap lists only **6 URLs** and `lastmod` is stuck at **2025-08-05**. Public pages missing from sitemap include:

- `/blog.html`
- `/blog-article.html`
- `/horary-points.html`
- `/chinese-organ-clock.html`
- `/terms.html`

**Why it matters:** Google may discover these via links, but omitting them slows indexing and understates site structure.

**Fix:**

1. Add missing public marketing URLs.
2. Set `lastmod` to actual deploy dates (or run bump on each content change).
3. Keep **reviewer tools** out of sitemap (`reviewers/verify.html`, etc.).
4. Resubmit sitemap in Google Search Console after deploy.

**Files:** `sitemap.xml`

**Note:** Live `https://jetlagpro.com/sitemap.xml` returned **HTTP 200** (verified 2026-05-30). Some automated fetch tools may intermittently report errors; use curl/GSC for confirmation.

---

### 3. Add missing meta descriptions and canonical tags

**Issue:**

| Page | Meta description | Canonical |
|------|------------------|-----------|
| `research-paper.html` | **Missing** | **Missing** |
| `privacy.html` | Weak / promotional | **Missing** |
| `terms.html` | Present | **Missing** |
| `chinese-organ-clock.html` | Present | **Missing** |
| `demo/index.html` | Present | **Missing** |

**Why it matters:** Google often rewrites missing descriptions; research paper is a high-value page for credibility searches.

**Fix:** Add unique description + canonical for each. Research paper example angle: "Pre-registered observational study of chronoacupuncture for jet lag — methods, platform, and transparency."

**Files:** listed above.

---

## Fix this month

### 4. Strengthen internal linking and navigation

**Issue:** Header nav links Home, Science, Travel Tips, Blog, Research — but **horary-points** and **chinese-organ-clock** are only reachable from blog cards, not main nav or sitemap.

**Fix:** Add contextual links from `science.html` and `travel-tips.html` to horary/organ-clock pages; link blog posts back to `#download` and `demo/`.

---

### 5. Indexation hygiene for reviewer tools

**Issue:** `reviewers/audit-log.html` and `reviewers/analysis.html` use `noindex, nofollow`. **`reviewers/verify.html`** has no robots meta (title only: "Verify Audit Trail") — may be indexed unintentionally.

**Fix:** Add `<meta name="robots" content="noindex, nofollow">` to `verify.html` if it is not meant for public SEO.

---

### 6. Content depth (Skill 09 follow-up)

**Issue:** Blog index shows **two** substantive articles; thin for competitive travel-health queries.

**Fix:** Run Skill 01 keyword research, then Skill 09 content plan — prioritize informational posts (e.g. "how circadian rhythm shifts when flying east vs west", "what is chronoacupuncture") that link to app demo and research paper. Avoid cure language.

---

### 7. Google Search Console + monthly reporting (Skill 10)

**Issue:** Audit cannot confirm GSC connection from code alone.

**Fix:** Verify property, submit sitemap, track: organic clicks, average position, CTR, demo page entries, download-section scroll/click if measurable.

---

## Backlog (lower priority)

- **Meta keywords** on several pages — Google ignores; remove or trim to reduce claim risk.
- **`Crawl-delay: 1`** in `robots.txt` — harmless; Google ignores.
- **AI bot disallow rules** (Cloudflare) — fine; does not block Googlebot.
- **Page speed audit** — run [PageSpeed Insights](https://pagespeed.web.dev/) on homepage + demo; compress large PNGs if LCP is slow.
- **Reviewer `verify.html` title** — make descriptive for humans; keep noindex if internal.
- **Structured data** — homepage `MobileApplication` JSON-LD is good; consider `FAQPage` on FAQ-style sections after copy stabilizes.

---

## What is working well

| Area | Status |
|------|--------|
| HTTPS + HSTS | Yes (Cloudflare) |
| `robots.txt` | Allows crawl; sitemap URL declared |
| Live sitemap | HTTP 200 |
| Homepage canonical + OG/Twitter | Present |
| Mobile viewport | Present on checked pages |
| Cache busting | `?v=20260527123349` pattern in use |
| `llms.txt` | Clear product/research boundaries for AI/search |
| Research integrity docs | Linked from llms.txt |
| Homepage schema | `MobileApplication` JSON-LD |

---

## Suggested meta rewrite direction (Skill 03 starter — not final)

**Homepage title (informational):**  
`JetLagPro | Chronoacupuncture App for Jet Lag (Free Research Phase)`

**Homepage meta description:**  
`Free iOS app with timed acupressure reminders aligned to your destination time zone. Join the observational study or try the interactive demo.`

Steven should approve final wording before deploy.

---

## Verification checklist (after fixes)

1. `curl -sI https://jetlagpro.com/sitemap.xml` → 200  
2. View source on homepage — no "cure" / fixed-day promises in title or meta  
3. GSC → Sitemaps → success; request indexing for updated URLs  
4. Spot-check mobile layout on homepage + `#download`  
5. Confirm TestFlight vs App Store CTA matches release state  

---

## Next skills to run

| Order | Skill | Purpose |
|-------|--------|---------|
| 1 | **03 Meta tags** | Final titles/descriptions for homepage, science, research-paper |
| 2 | **01 Keyword research** | Non-branded travel/jet-lag/chronoacupuncture terms |
| 3 | **09 Content plan** | Blog cluster roadmap |
| 4 | **10 Reporting** | Baseline metrics after GSC confirm |

---

*Generated using `.cursor/skills/seo-and-search` Skill 04 · jetlagpro-website*
