"""
Fetches template photography for the specialist trade templates.

Earlier passes guessed Unsplash photo IDs from memory, which had a poor hit
rate for niche trades — a locksmith search returned hotel signs and a pest
control search returned desert landscapes. This queries Unsplash's search
instead, so the candidates are actually relevant, and it prints each photo's
description so the selection can be sanity-checked before download.
"""

import json
import os
import subprocess
import sys
import urllib.parse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO_ROOT, "public", "templates", "_cand2")
UA = "Mozilla/5.0 (compatible; webser-template-fetch/1.0)"

# Query terms per template. Several phrasings per trade because a single term
# tends to return one visual cliche over and over.
QUERIES = {
    "electrician": ["electrician working", "electrical panel breaker", "electrician wiring outlet"],
    "hvac": ["hvac technician", "air conditioner unit outside", "furnace repair"],
    "locksmith": ["locksmith key", "door lock installation", "house keys door handle"],
    "pest-control": ["pest control technician", "exterminator spraying", "termite inspection"],
    "handyman": ["handyman tools repair", "home repair drill", "toolbox home improvement"],
    "garage-door": ["garage door house", "garage door opener", "residential garage exterior"],
    "fence": ["wooden fence backyard", "fence installation", "picket fence yard"],
    "concrete": ["concrete pouring construction", "concrete driveway", "cement finishing trowel"],
    "tree-service": ["arborist tree climbing", "tree removal chainsaw", "tree trimming service"],
    "painting": ["house painter roller", "painting interior wall", "paint brush wall"],
    "junk-removal": ["moving boxes truck loading", "old furniture removal", "cleaning out garage"],
}


def curl(url, binary=False):
    """urllib gets 401 from this endpoint; curl is accepted, so shell out."""
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "60", "-H", "Accept: application/json", url],
        capture_output=True,
    )
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")


def search(query, per_page=12):
    url = "https://unsplash.com/napi/search/photos?" + urllib.parse.urlencode(
        {"query": query, "per_page": per_page, "orientation": "landscape"}
    )
    body = curl(url)
    return json.loads(body).get("results", [])


def download_url(url, dest):
    data = curl(url, binary=True)
    if len(data) < 12000:
        return False
    with open(dest, "wb") as f:
        f.write(data)
    return True


def main():
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None

    for industry, queries in QUERIES.items():
        if only and industry != only:
            continue

        seen = set()
        idx = 0
        print(f"\n=== {industry} ===")

        for q in queries:
            try:
                results = search(q)
            except Exception as e:
                print(f"  search failed ({q}): {e}")
                continue

            for r in results:
                if idx >= 12:
                    break
                pid = r["id"]
                if pid in seen:
                    continue
                seen.add(pid)

                raw = r["urls"]["raw"]
                url = raw + "&w=800&h=600&q=68&fit=crop"
                dest = os.path.join(OUT, f"{industry}-{idx}.jpg")
                desc = (r.get("alt_description") or "")[:64]

                try:
                    if download_url(url, dest):
                        print(f"  {industry}-{idx:<2} {desc}")
                        idx += 1
                except Exception as e:
                    print(f"  fail {pid}: {e}")

            if idx >= 12:
                break


if __name__ == "__main__":
    main()
