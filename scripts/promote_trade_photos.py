"""
Promotes visually-reviewed candidates into public/templates/<industry>/.

The picks below are indexes into the candidate set produced by
fetch_trade_photos.py, chosen after looking at every one on a contact sheet.
Because those indexes only mean anything if the search returns the same
results in the same order, this re-runs the searches, rebuilds the mapping,
and verifies a sample of already-downloaded files still byte-match before
promoting anything.
"""

import hashlib
import json
import os
import subprocess
import sys
import urllib.parse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAND = os.path.join(REPO_ROOT, "public", "templates", "_cand2")
ROOT = os.path.join(REPO_ROOT, "public", "templates")

from fetch_trade_photos import QUERIES  # noqa: E402  (same directory)

# industry -> (hero_index, [six gallery indexes])
PICKS = {
    "electrician": (0, [3, 7, 4, 8, 9, 11]),
    "hvac": (0, [8, 4, 7, 2, 5, 10]),
    "locksmith": (11, [3, 7, 8, 5, 0, 1]),
    "pest-control": (2, [0, 4, 8, 1, 5, 11]),
    "handyman": (1, [2, 0, 5, 9, 4, 10]),
    "garage-door": (0, [4, 8, 5, 9, 11, 3]),
    "fence": (8, [0, 2, 11, 10, 4, 1]),
    "concrete": (0, [5, 8, 1, 9, 4, 6]),
    "tree-service": (0, [5, 3, 4, 2, 9, 1]),
    "painting": (0, [4, 6, 5, 1, 3, 11]),
    "junk-removal": (7, [3, 0, 4, 5, 2, 8]),
}


def curl(url, binary=False):
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "60", "-H", "Accept: application/json", url],
        capture_output=True,
    )
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")


def search(query, per_page=12):
    url = "https://unsplash.com/napi/search/photos?" + urllib.parse.urlencode(
        {"query": query, "per_page": per_page, "orientation": "landscape"}
    )
    return json.loads(curl(url)).get("results", [])


def build_manifest(industry):
    """Rebuild index -> raw URL exactly as fetch_trade_photos.py did."""
    seen, out = set(), []
    for q in QUERIES[industry]:
        try:
            results = search(q)
        except Exception:
            continue
        for r in results:
            if len(out) >= 12:
                break
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            out.append(r["urls"]["raw"])
        if len(out) >= 12:
            break
    return out


def sha(data):
    return hashlib.sha256(data).hexdigest()[:16]


def main():
    problems = []

    for industry, (hero_idx, gallery_idx) in PICKS.items():
        manifest = build_manifest(industry)
        if len(manifest) < 12:
            problems.append(f"{industry}: only {len(manifest)} results")
            continue

        # Integrity check: does the rebuilt manifest still line up with what we
        # actually reviewed? Compare one already-downloaded candidate.
        probe = gallery_idx[0]
        existing = os.path.join(CAND, f"{industry}-{probe}.jpg")
        if not os.path.exists(existing):
            problems.append(f"{industry}: candidate {probe} missing — cannot verify picks")
            continue
        fresh = curl(manifest[probe] + "&w=800&h=600&q=68&fit=crop", binary=True)
        with open(existing, "rb") as f:
            if sha(f.read()) != sha(fresh):
                problems.append(f"{industry}: ordering changed at index {probe} — picks unsafe")
                continue

        dest = os.path.join(ROOT, industry)
        os.makedirs(dest, exist_ok=True)

        hero = curl(manifest[hero_idx] + "&w=1920&h=1080&q=78&fit=crop", binary=True)
        if len(hero) < 20000:
            problems.append(f"{industry}: hero download failed")
            continue
        with open(os.path.join(dest, "hero.jpg"), "wb") as f:
            f.write(hero)

        for n, idx in enumerate(gallery_idx, start=1):
            data = curl(manifest[idx] + "&w=900&h=675&q=70&fit=crop", binary=True)
            if len(data) < 12000:
                problems.append(f"{industry}: gallery {n} failed")
                continue
            with open(os.path.join(dest, f"{n}.jpg"), "wb") as f:
                f.write(data)

        print(f"{industry:<14} hero + {len(gallery_idx)} gallery")

    print("\n" + ("PROBLEMS:\n  " + "\n  ".join(problems) if problems else "no problems"))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
