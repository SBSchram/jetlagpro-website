# JetLagPro SEO Content Plan (Skills 01 + 09)

**Date:** 2026-05-30  
**Site:** https://jetlagpro.com  
**Goal:** Non-branded organic discovery → demo + app download + research credibility  
**Constraint:** Informational framing only (see `.cursor/soul.md`, `llms.txt`)

---

## 1. Keyword research summary (Skill 01)

### Search intent clusters

| Cluster | Example queries | Intent | JetLagPro fit |
|---------|-----------------|--------|---------------|
| **Jet lag how-to** | how to avoid jet lag, jet lag recovery, east vs west travel | Informational | High — travel-tips + new posts |
| **Circadian / body clock** | circadian rhythm travel, why jet lag happens | Informational | High — blog-article, expand cluster |
| **Acupressure / TCM travel** | acupressure for jet lag, horary points, Chinese organ clock | Informational / commercial | **Differentiator** — low competition vs generic jet lag |
| **Chronoacupuncture** | chronoacupuncture jet lag, timed acupressure time zones | Informational / commercial | **Owned niche** — few quality pages |
| **App / tool** | jet lag app, circadian travel app | Commercial / transactional | Medium — homepage, demo; App Store still primary |
| **Research** | jet lag study acupressure, observational travel health | Navigational / informational | High — research-paper.html |

### Quick-win keywords (prioritize first)

| Keyword / topic | Why quick win | Target page |
|-----------------|---------------|-------------|
| Chinese organ clock jet lag | Low competition; you already have `chinese-organ-clock.html` | Expand + internal links (done) |
| horary points jet lag | Practitioner blogs rank; few app-led explainers | `horary-points.html` + blog |
| what is chronoacupuncture | Niche term; aligns with brand | New pillar or science section |
| jet lag east vs west travel tips | High volume; match travel-tips without “cure” claims | New article |
| circadian rhythm when flying | PAA-style question; blog-article adjacent | New article |
| acupressure every two hours travel | Matches protocol description | horary + how-it-works post |

### Keywords to avoid (for now)

| Keyword | Reason |
|---------|--------|
| jet lag cure / beat jet lag fast | Overclaim + dominated by sleep clinics & listicles |
| best jet lag app | Competitive; App Store SERP heavy |
| acupuncture near me | Local intent — not your model |
| melatonin dosage jet lag | Medical-adjacent; cite sources carefully if covered |

---

## 2. Content cluster structure (Skill 09)

### Pillar A — Chronoacupuncture & horary points (differentiator)

**Pillar page (existing, enhance over time):** `science.html`  
**Supporting pages (existing):**

- `chinese-organ-clock.html`
- `horary-points.html`
- `blog-article.html`

**New supporting pages (proposed):**

1. **What is chronoacupuncture?** — definition, history (Amaro protocol), how JetLagPro implements it, link to OSF pre-registration  
2. **How the 2-hour schedule works** — destination clock, missed windows, cramped-seat points  
3. **Eastward vs westward travel** — informational circadian context + travel tips cross-link (no guaranteed recovery times)

### Pillar B — Practical jet lag education (volume)

**Pillar page (existing):** `travel-tips.html`  
**New supporting pages:**

1. **Jet lag and light exposure** — zeitgeber explainer, east/west timing tables  
2. **Melatonin and jet lag** — informational; emphasize timing over dose; not medical advice  
3. **First 48 hours after landing** — checklist aligned with app + tips (no “cure” language)

### Pillar C — Research & trust (E-E-A-T)

**Pillar page (existing):** `research-paper.html`  
**Supporting:**

- Link from every blog post footer  
- Optional: **About the study** short page (methods in plain English) if paper is too long for casual readers

---

## 3. Publishing schedule (realistic: ~1 post / 2 weeks)

| Priority | Piece | Target keyword | Est. length | Links to |
|----------|-------|----------------|-------------|----------|
| **1** | What is chronoacupuncture? | chronoacupuncture jet lag | 900–1200 words | science, horary, research-paper, demo |
| **2** | Eastward vs westward jet lag | eastward jet lag tips | 800–1000 words | travel-tips, blog-article, #download |
| **3** | How the JetLagPro 2-hour schedule works | horary points schedule | 700–900 words | horary-points, demo |
| **4** | Light exposure for jet lag (deep dive) | light therapy jet lag travel | 800 words | travel-tips |
| **5** | Melatonin timing (informational) | melatonin jet lag timing | 700 words | travel-tips, disclaimer |

After each publish: add URL to `sitemap.xml`, link from `blog.html`, 2–3 internal links from existing pages.

---

## 4. On-page checklist (each new post)

- [ ] One H1, keyword in first 100 words naturally  
- [ ] Title & meta description (Skill 03) — informational, no fixed recovery promises  
- [ ] Canonical URL  
- [ ] 2–3 internal links out; link in from science, travel-tips, or blog index  
- [ ] CTA block: demo + `#download`  
- [ ] Author line: Dr. Steven Schram, Licensed Acupuncturist  
- [ ] Research disclaimer where health outcomes discussed  

---

## 5. Internal linking (implemented 2026-05-30)

| From | To |
|------|-----|
| `science.html` | blog-article, chinese-organ-clock, horary-points, travel-tips, demo, #download |
| `travel-tips.html` | science, horary, organ clock, blog-article, demo, #download |
| `chinese-organ-clock.html` | horary-points, science, research-paper, demo |
| `horary-points.html` | science, chinese-organ-clock, demo, #download |
| `blog-article.html` | organ clock, science, travel-tips, horary; fixed demo/home URLs |

---

## 6. Reporting (Skill 10 — monthly)

Track in Google Search Console:

1. Organic clicks (total + non-branded queries containing “jet lag”, “chronoacupuncture”, “horary”, “organ clock”)  
2. Average position for `/science.html`, `/horary-points.html`, `/blog-article.html`  
3. CTR on homepage and research-paper  
4. Demo page impressions/clicks  
5. Manual note: App Store vs website as download source  

**Decision rules:**

- CTR &lt; 2% on a URL → rewrite meta (Skill 03)  
- Impressions up, clicks flat → improve titles  
- New post indexed but no impressions after 60 days → refresh on-page + internal links  

---

## 7. Next executor tasks (when Steven approves)

1. Draft **“What is chronoacupuncture?”** (Priority 1 brief above)  
2. Soften remaining claim-heavy meta on `horary-points.html` / `blog-article.html` (OG still says “reset naturally”)  
3. Add `blog.html` entries as new posts ship  

---

*Generated via `.cursor/skills/seo-and-search` · jetlagpro-website*
