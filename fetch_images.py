#!/usr/bin/env python3
"""
fetch_images.py — 画像係 (the image fetcher)

What it does:
  Reads a finished edition file (news-latest.json / haberler-latest.json),
  and for every article it finds the article's own picture:

    1. If the collector already found a feed image (candidates' "image"
       field, copied into the article as "img" by the curator), keep it.
    2. Otherwise open the article page and read its  og:image  — the
       <meta property="og:image" content="..."> tag that almost every
       news site includes so social media can show a thumbnail. That is
       the picture the publisher itself chose for the article.
    3. Validate the image URL really loads and really is an image
       (HTTP 200 + Content-Type image/...). A broken or fake image URL
       is worse than no image, so failures are dropped, not kept.

  Articles that end up with no image simply have no "img" field —
  the page design falls back to the plain card. A missing image must
  never block publishing the news.

Run:  python3 fetch_images.py                      (Japanese edition)
      python3 fetch_images.py haberler-latest.json (Turkish edition)

Only Python's standard library is used — nothing to install.
"""

import json
import re
import sys
import urllib.request
from urllib.parse import urljoin

HERE = __file__.rsplit("/", 1)[0]
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,image/*,*/*"}


def find_og_image(html, base_url):
    """Return the page's og:image (or twitter:image) as an absolute URL."""
    # <meta property="og:image" content="X"> — attribute order varies,
    # so match the whole meta tag first, then pull content= out of it.
    for m in re.finditer(r'<meta[^>]+(?:og:image|twitter:image)[^>]*>', html, re.I):
        c = re.search(r'content=["\']([^"\']+)["\']', m.group(0), re.I)
        if c:
            return urljoin(base_url, c.group(1).strip())
    return ""


def image_loads(url):
    """True only if the URL answers 200 and serves an image type."""
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=15) as r:
            ctype = r.headers.get_content_type() or ""
            r.read(1024)  # touch the body so dead links fail here, not later
            return r.status == 200 and ctype.startswith("image/")
    except Exception:
        return False


def og_image_for(article_url):
    try:
        req = urllib.request.Request(article_url, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read(600_000).decode("utf-8", errors="ignore")
    except Exception:
        return ""
    return find_og_image(html, article_url)


def main():
    fname = sys.argv[1] if len(sys.argv) > 1 else "news-latest.json"
    path = f"{HERE}/{fname}"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    for a in data["articles"]:
        if a.get("img"):
            if image_loads(a["img"]):
                print(f"KEEP  {a['source']}: feed image OK")
                continue
            print(f"DROP  {a['source']}: feed image did not load, refetching")
            a.pop("img", None)
        img = og_image_for(a["url"])
        if img and image_loads(img):
            a["img"] = img
            print(f"OK    {a['source']}: {img[:80]}")
        else:
            print(f"NONE  {a['source']}: no usable image (card will have none)")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nUpdated {fname}")


if __name__ == "__main__":
    main()
