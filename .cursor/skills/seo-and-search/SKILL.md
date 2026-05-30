---
name: seo-and-search
description: >-
  SEO and search visibility for jetlagpro.com. Use for keyword research, site audits,
  meta tags, technical SEO, content plans, and reporting. Always follow
  .cursor/soul.md claim restraint and research-integrity rules.
---

# SEO & Search — JetLagPro Website

Prompt Guy AI Skills Bundle (adapted). Full generic examples: `REFERENCE.md` in this folder.

**Before any output:** read `.cursor/soul.md`. Health/research wording stays informational. No cure/guarantee language unless Steven approves.

---

## JetLagPro business context (filled)

```
Your name or business name: JetLagPro (Dr. Steven Schram, Licensed Acupuncturist)
Your website URL: https://jetlagpro.com
What your website or business is about: Public site for a chronoacupuncture jet-lag app (iOS/watchOS); research paper, demo, privacy/terms, TestFlight/App Store download
Who your target audience is: Travelers seeking jet-lag support; research participants and reviewers; App Store visitors
What your main product or service is: Free native app during observational research phase; website drives trust, download, and research transparency
What city or region you serve: Online (global); telehealth not applicable — app + static site
What your main competitors are: Other jet-lag apps, sleep/travel wellness products, generic acupressure/travel health content
What your current biggest SEO problem is: Limited non-branded organic traffic; strong brand story but thin indexable content; some meta copy overclaims vs research positioning
```

---

## How to use in this repo

1. Open the **jetlagpro-website** folder in Cursor (not only JetLagProject).
2. Invoke by name: e.g. "Run Skill 04 site audit on jetlagpro.com".
3. For live checks, use WebFetch/curl; verify claims against `llms.txt`, `docs/PRODUCT.md`, and `TF_POLICY_REVIEW.md` when present locally.
4. After HTML/CSS/JS changes, bump cache version (`npm run bump-cache` or `scripts/bump-cache-version.cjs`) per project lessons.

---

## Skill index

| # | Skill | Use when |
|---|--------|----------|
| 01 | Keyword research | Before new content or page rewrites |
| 02 | On-page optimization | Page ranks page 2–3 or traffic underperforms |
| 03 | Meta tags | New pages, low CTR in GSC |
| 04 | Site audit | Low traffic, sudden drop, or pre-content sprint |
| 05 | Local SEO | **Usually skip** (global online product) |
| 06 | YouTube SEO | Only if publishing JetLagPro videos |
| 07 | Link building | Authority stuck after on-page fixes |
| 08 | Technical SEO checklist | New site setup or post-audit technical pass |
| 09 | SEO content plan | After keyword research |
| 10 | SEO reporting | Monthly GSC/analytics review |

---

## SKILL 04 — SITE AUDIT (process)

### What it does

Finds specific issues holding **this** site back — not generic SEO lists.

### What to ask Steven first (if unknown)

1. Website URL (default: https://jetlagpro.com)
2. Platform: static HTML on GitHub Pages + Cloudflare
3. Organic traffic level (rough)
4. Recent changes (deploy, copy, TestFlight → App Store)
5. Google Search Console connected?
6. Primary goal: app downloads, research credibility, or both

### Process

1. **Visit site** — homepage, science, travel-tips, blog, research-paper, demo, privacy, download section.
2. **Technical fundamentals** — HTTPS, robots.txt, sitemap (live 200), mobile viewport, canonicals, title/H1 uniqueness, broken links, Core Web Vitals hints, cache headers.
3. **Content fundamentals** — intent match, duplicate/thin pages, internal links, claim alignment with research framing.
4. **Prioritised fix list** — top 3 this week, next 3 this month, rest later; plain language; flag developer-only items.
5. **How to fix** — file-level guidance for this repo (`index.html`, `sitemap.xml`, etc.).

### JetLagPro-specific audit checks

- Meta/titles must not promise cures or fixed timelines (e.g. avoid "2–3 days" / "jet lag cure" unless Steven approves).
- `sitemap.xml` must include all public marketing URLs; exclude `reviewers/` tools (use `noindex` where needed).
- Research/reviewer pages: accuracy and `noindex` on internal tools.
- Download CTA must match current release state (TestFlight vs App Store).
- Do not recommend black-hat tactics.

### Output format

```markdown
## Executive summary
## Fix this week (1–3)
## Fix this month (next 3)
## Backlog
## What to verify after fixes
```

Save audits as `SEO_SITE_AUDIT_YYYY-MM-DD.md` in repo root unless Steven asks otherwise.

---

## Other skills (summary)

**01 Keyword research:** Web search for volume/intent/PAA; map quick wins vs avoid; cluster by topic.

**02 On-page:** Compare top 5 SERP results; gap analysis; rewrite H1, intro, weak sections; internal link plan.

**03 Meta tags:** 3 title options (<60 chars), 2 descriptions (<155 chars), recommend one pair; no stuffing.

**05 Local SEO:** Skip unless Steven targets a geographic market.

**06 YouTube:** Title, description, tags, chapters for video uploads.

**07 Link building:** Tiered outreach; no paid link schemes; ethical only.

**08 Technical checklist:** HTTPS, robots, sitemap, speed, mobile, titles, metas, H1, alt text, canonicals, CWV, internal links, 404s, duplicates — prioritised.

**09 Content plan:** Pillar + cluster briefs from keyword map; publish order by quick-win potential.

**10 Reporting:** Five metrics for goal (downloads/research); monthly template; decision rules (CTR <2% → meta; traffic drop → technical + GSC).

---

## Writing rules (all skills)

- Reader first, search second.
- No keyword stuffing; no guaranteed rankings.
- No black hat.
- Banned hype words/phrases: see `REFERENCE.md` (Prompt Guy list).
- When advice may be stale, search current SERPs first.

---

*Adapted from Prompt Guy AI Skills Bundle · promptguy.io · JetLagPro website repo*
