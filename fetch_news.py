#!/usr/bin/env python3
"""
fetch_news.py — 収集係 (the collector)

What it does:
  1. Reads the source list from sources.json
  2. Downloads each source's RSS feed
  3. Keeps only items published in the last 24 hours
  4. Writes them to candidates.json  -> this is the AI's input (see PROMPT.md)

It does NOT choose the top 5 and does NOT write summaries.
Choosing + summarizing is the AI's job, guided by PROMPT.md.
Keeping collection and selection separate makes debugging easy:
if the page looks wrong, first check candidates.json (collection bug?)
then check news-latest.json (selection bug?).

Run:  python3 fetch_news.py
      python3 fetch_news.py sources-tr.json candidates-tr.json   (Turkish edition)

The SAME collector serves both editions: it takes an optional sources
file and output file as arguments. Defaults are the Japanese edition.
Only Python's standard library is used — nothing to install.
"""

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

HERE = __file__.rsplit("/", 1)[0]
JST = timezone(timedelta(hours=9))
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"}


def parse_date(text):
    """Feed dates come in many formats. Return an aware datetime or None."""
    if not text:
        return None
    try:
        dt = parsedate_to_datetime(text)  # RFC822 style (RSS)
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))  # Atom style
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def local(tag):
    """Tag name without its namespace: '{http://...}item' -> 'item'.
    RSS 1.0 (RDF) puts every tag in a namespace, RSS 2.0 does not —
    matching by local name handles both (learned the hard way: the
    Nikkei feed silently produced 0 items until this was fixed)."""
    return tag.rsplit("}", 1)[-1]


def child_text(el, names):
    for ch in el:
        if local(ch.tag) in names and ch.text:
            return ch.text.strip()
    return ""


def item_image(el, desc):
    """Best picture attached to a feed item, or "" if the feed has none.
    Feeds hide images in different places: an <enclosure>, a
    <media:content> / <media:thumbnail> tag, or an <img> embedded in the
    description HTML. This is only a hint for the curator — the final
    image check happens later in fetch_images.py."""
    for ch in el:
        name = local(ch.tag)
        url = ch.get("url", "")
        if name == "enclosure" and url and (
                ch.get("type", "").startswith("image/")
                or url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".webp"))):
            return url
        if name in ("content", "thumbnail") and url:
            return url
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc or "", re.I)
    return m.group(1) if m else ""


def items_from_feed(xml_bytes):
    """Yield (title, link, date_text, description, image) from RSS/Atom."""
    root = ET.fromstring(xml_bytes)
    for el in root.iter():
        kind = local(el.tag)
        if kind == "item":  # RSS 2.0 and RSS 1.0/RDF
            desc = child_text(el, {"description"})
            yield (
                child_text(el, {"title"}),
                child_text(el, {"link"}),
                child_text(el, {"pubDate", "date"}),
                desc,
                item_image(el, desc),
            )
        elif kind == "entry":  # Atom
            link = ""
            for ch in el:
                if local(ch.tag) == "link" and ch.get("rel") in (None, "alternate"):
                    link = ch.get("href", "")
            desc = child_text(el, {"summary"})
            yield (
                child_text(el, {"title"}),
                link,
                child_text(el, {"published", "updated"}),
                desc,
                item_image(el, desc),
            )


def main():
    import sys
    sources_file = sys.argv[1] if len(sys.argv) > 1 else "sources.json"
    out_file = sys.argv[2] if len(sys.argv) > 2 else "candidates.json"
    with open(f"{HERE}/{sources_file}", encoding="utf-8") as f:
        sources = json.load(f)["sources"]

    now = datetime.now(JST)
    cutoff = now - timedelta(hours=24)
    candidates = []
    report = []

    for src in sources:
        if not src.get("enabled", True) or not src.get("feed"):
            report.append(f"SKIP  {src['name']} (no feed / disabled)")
            continue
        try:
            req = urllib.request.Request(src["feed"], headers=UA)
            with urllib.request.urlopen(req, timeout=20) as r:
                xml = r.read()
            kept = 0
            for title, link, date_text, desc, image in items_from_feed(xml):
                dt = parse_date(date_text)
                if not title or not link or dt is None:
                    continue
                if dt.astimezone(JST) < cutoff:
                    continue  # older than 24h -> not a candidate
                candidates.append({
                    "source": src["name"],
                    "lang": src.get("lang", "ja"),
                    "title": title,
                    "url": link,
                    "published": dt.astimezone(JST).strftime("%Y-%m-%d %H:%M JST"),
                    "description": desc[:300],
                    "image": image,
                })
                kept += 1
            report.append(f"OK    {src['name']}: {kept} items in last 24h")
        except Exception as e:  # one broken feed must not kill the whole run
            report.append(f"FAIL  {src['name']}: {e}")

    candidates.sort(key=lambda c: c["published"], reverse=True)
    out = {"generated": now.strftime("%Y-%m-%d %H:%M JST"), "candidates": candidates}
    with open(f"{HERE}/{out_file}", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print("\n".join(report))
    print(f"\nTotal candidates: {len(candidates)} -> {out_file}")


if __name__ == "__main__":
    main()
