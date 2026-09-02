#!/usr/bin/env bash
# Promotes visually-verified candidate photos into public/templates/<industry>/
# and re-fetches each hero at full width. Every photo below was checked on a
# contact sheet before being listed here.
set -u

CAND="public/templates/_candidates"
ROOT="public/templates"

hero() { # industry  photo-id
  mkdir -p "$ROOT/$1"
  local code
  code=$(curl -sS -o "$ROOT/$1/hero.jpg" -w "%{http_code}" \
    "https://images.unsplash.com/photo-$2?w=1920&h=1080&q=78&auto=format&fit=crop")
  local sz; sz=$(stat -c%s "$ROOT/$1/hero.jpg")
  if [ "$sz" -lt 20000 ]; then echo "HERO FAIL $1 ($code)"; else echo "hero $1 (${sz}b)"; fi
}

gal() { # industry  n  candidate-basename
  mkdir -p "$ROOT/$1"
  if [ -s "$CAND/$3.jpg" ]; then cp "$CAND/$3.jpg" "$ROOT/$1/$2.jpg";
  else echo "MISSING $3"; fi
}

# ---- plumbing ----
hero plumbing 1558618666-fcd25c85cd64
gal plumbing 1 plumbing-0; gal plumbing 2 plumbingb-0; gal plumbing 3 plumbing-4
gal plumbing 4 plumbingb-5; gal plumbing 5 plumbing-2; gal plumbing 6 plumbingb-1

# ---- auto-repair ----
hero auto-repair 1625047509168-a7026f36de04
gal auto-repair 1 auto-0; gal auto-repair 2 auto-1; gal auto-repair 3 auto-2
gal auto-repair 4 auto-4; gal auto-repair 5 auto-6; gal auto-repair 6 auto-7

# ---- roofing ----
hero roofing 1632759145351-1d592919f522
gal roofing 1 roofingb-3; gal roofing 2 roofingb-4; gal roofing 3 roofingb-6
gal roofing 4 roofing-2; gal roofing 5 roofing-4; gal roofing 6 roofing-7

# ---- landscaping ----
hero landscaping 1558904541-efa843a96f01
gal landscaping 1 landscaping-2; gal landscaping 2 lawn-4; gal landscaping 3 landscaping-4
gal landscaping 4 roofingb-4; gal landscaping 5 landscaping-6; gal landscaping 6 landscaping-7

# ---- general-contractor ----
hero general-contractor 1504307651254-35680f356dfd
gal general-contractor 1 contractor-4; gal general-contractor 2 contractor-3
gal general-contractor 3 contractor-5; gal general-contractor 4 contractor-7
gal general-contractor 5 contractor-6; gal general-contractor 6 contractor-1

# ---- restaurant ----
hero restaurant 1552566626-52f8b828add9
gal restaurant 1 restaurant-1; gal restaurant 2 restaurant-3; gal restaurant 3 restaurant-6
gal restaurant 4 restaurant-0; gal restaurant 5 restaurant-5; gal restaurant 6 restaurant-4

# ---- barber-salon ----
hero barber-salon 1585747860715-2ba37e788b70
gal barber-salon 1 barber-0; gal barber-salon 2 barber-4; gal barber-salon 3 barber-3
gal barber-salon 4 barber-6; gal barber-salon 5 barber-5; gal barber-salon 6 barber-7

# ---- dental ----
hero dental 1629909613654-28e377c37b09
gal dental 1 dental-4; gal dental 2 dental-5; gal dental 3 dental-3
gal dental 4 dental-0; gal dental 5 dental-7; gal dental 6 dental-2

echo "---"
du -sh "$ROOT" 2>/dev/null
find "$ROOT" -name "*.jpg" -not -path "*_candidates*" | wc -l
