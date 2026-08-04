"""Insert GA4 gtag into JetLagPro public HTML pages."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEASUREMENT_ID = "G-4PTS16JF06"

GA_BLOCK = f"""<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id={MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{MEASUREMENT_ID}');
</script>
"""

# Public site pages only (skip reviewers, flyers, fragments, downloads, tests)
PAGES = [
    "index.html",
    "science.html",
    "demo/index.html",
    "blog.html",
    "blog-article.html",
    "blog-chronoacupuncture.html",
    "blog-east-west-jetlag.html",
    "blog-light-exposure-jetlag.html",
    "blog-melatonin-jetlag-timing.html",
    "blog-two-hour-schedule.html",
    "travel-tips.html",
    "terms.html",
    "privacy.html",
    "privacy-android.html",
    "research-paper.html",
    "horary-points.html",
    "chinese-organ-clock.html",
    "call-for-research.html",
    "404.html",
    "offline.html",
]


def insert_ga(text: str) -> str | None:
    if "G-4PTS16JF06" in text or "googletagmanager.com/gtag/js" in text:
        return None  # already present
    # Prefer right after <head ...>
    lower = text.lower()
    idx = lower.find("<head")
    if idx < 0:
        return None
    end = text.find(">", idx)
    if end < 0:
        return None
    return text[: end + 1] + "\n" + GA_BLOCK + text[end + 1 :]


def main() -> None:
    updated = 0
    skipped = 0
    missing = 0
    for rel in PAGES:
        path = ROOT / rel
        if not path.exists():
            print("missing", rel)
            missing += 1
            continue
        original = path.read_text(encoding="utf-8")
        new = insert_ga(original)
        if new is None:
            print("skip", rel)
            skipped += 1
            continue
        path.write_text(new, encoding="utf-8", newline="\n")
        print("updated", rel)
        updated += 1
    print(f"done updated={updated} skipped={skipped} missing={missing}")


if __name__ == "__main__":
    main()
