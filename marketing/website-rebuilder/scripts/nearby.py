"""Find businesses nearest-first: closest ones, then wider and wider rings.

Uses OpenStreetMap (free, no API key): Nominatim to geocode the starting point, Overpass to list businesses of the
niche around it. Results come out ring by ring (default 1, 2, 5, 10, 20, 40 km), each ring sorted by distance, never
repeating a business from an inner ring. Only businesses that list a website are kept by default (that's what gets
rebuilt); --all keeps the rest too.

Usage:
  python nearby.py "<start: address, place or 'lat,lon'>" <niche> [--rings 1,2,5,10,20,40] [--min 15] [--all]
                   [--out leads.csv] [--score]

  --min N    stop widening once N businesses with a website have been found (default 15); the ring that crosses
             N is still listed in full so nothing equally close is skipped.
  --score    run score_sites.py on the websites, ring by ring, as they're found (nearest first).

  niche: dentist, clinic, doctor, plumber, electrician, roofer, hvac / aircon, pest, carpenter, painter, builder,
         gym, spa, salon, barber, restaurant, cafe, bakery, hotel, car-repair, lawyer, accountant, real-estate,
         vet, optician, pharmacy, school, tutor  (or any word: matched against business names too)

Be polite to the free services: 1 request per second, cached per run, identifying User-Agent (their usage policies).
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

UA = "claude-website-rebuilder/1.1 (local-business prospecting; contact via repo)"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
NICHES = {
    "dentist": ['amenity=dentist', 'healthcare=dentist'],
    "clinic": ['amenity=clinic', 'healthcare=clinic'],
    "doctor": ['amenity=doctors', 'healthcare=doctor'],
    "plumber": ['craft=plumber'], "electrician": ['craft=electrician'], "roofer": ['craft=roofer'],
    "hvac": ['craft=hvac'], "aircon": ['craft=hvac'], "pest": ['shop=pest_control', 'craft=pest_control'],
    "carpenter": ['craft=carpenter'], "painter": ['craft=painter'], "builder": ['craft=builder', 'office=construction_company'],
    "gym": ['leisure=fitness_centre'], "spa": ['leisure=spa', 'shop=massage'], "salon": ['shop=hairdresser', 'shop=beauty'],
    "barber": ['shop=hairdresser'], "restaurant": ['amenity=restaurant'], "cafe": ['amenity=cafe'], "bakery": ['shop=bakery'],
    "hotel": ['tourism=hotel', 'tourism=guest_house'], "car-repair": ['shop=car_repair'], "lawyer": ['office=lawyer'],
    "accountant": ['office=accountant', 'office=tax_advisor'], "real-estate": ['office=estate_agent'], "vet": ['amenity=veterinary'],
    "optician": ['shop=optician'], "pharmacy": ['amenity=pharmacy'], "school": ['amenity=school', 'amenity=college'],
    "tutor": ['office=educational_institution', 'amenity=training'],
}
_last = [0.0]


def _get(url: str | list, data: bytes | None = None) -> bytes:
    """GET/POST with 1 req/s pacing; a list of URLs = mirrors, tried in turn"""
    if isinstance(url, list):
        for i, u in enumerate(url):
            try:
                return _get1(u, data, tries=1, timeout=25)
            except Exception as e:  # noqa: BLE001
                print(f"  {u.split('/')[2]} failed ({str(e)[:70]}), next mirror", file=sys.stderr)
        raise ConnectionError("every Overpass mirror failed")
    return _get1(url, data)


def _get1(url: str, data: bytes | None = None, tries: int = 4, timeout: int = 60) -> bytes:
    wait = 1.0 - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                _last[0] = time.time()
                return r.read()
        except Exception as e:  # noqa: BLE001  (429 / 504 from the free Overpass servers: back off)
            if attempt == tries - 1:
                raise
            time.sleep(5 * (attempt + 1))
            print(f"  retry ({e})", file=sys.stderr)
    return b""


def geocode(q: str) -> tuple[float, float, str]:
    m = re.fullmatch(r"\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*", q)
    if m:
        return float(m.group(1)), float(m.group(2)), q
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q, "format": "json", "limit": 1})
    res = json.loads(_get(url))
    if not res:
        sys.exit(f"could not find '{q}' - try a fuller address or 'lat,lon'")
    return float(res[0]["lat"]), float(res[0]["lon"]), res[0]["display_name"]


def km(a, b, c, d) -> float:
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def query(lat: float, lon: float, radius_km: float, niche: str) -> list[dict]:
    """Overpass first (complete); if every mirror is down or blocked, Nominatim (top 50 matches per ring)."""
    if not _state.get("no_overpass"):
        try:
            return query_overpass(lat, lon, radius_km, niche)
        except ConnectionError:
            _state["no_overpass"] = True
            print("  Overpass unreachable - falling back to Nominatim (max 50 places per ring, less complete)", file=sys.stderr)
    return query_nominatim(lat, lon, radius_km, niche)


_state: dict = {}


def query_nominatim(lat: float, lon: float, radius_km: float, niche: str) -> list[dict]:
    dlat = radius_km / 111.0
    dlon = radius_km / (111.0 * max(0.2, math.cos(lat * math.pi / 180)))
    words = sorted({t.split("=")[1].replace("_", " ") for t in NICHES.get(niche.lower(), [])} | {niche.replace("-", " ")})
    out, seen = [], set()
    for w in words:
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
            "q": w, "format": "jsonv2", "limit": 50, "extratags": 1, "addressdetails": 1, "bounded": 1,
            "viewbox": f"{lon - dlon},{lat + dlat},{lon + dlon},{lat - dlat}"})
        for e in json.loads(_get(url)):
            key = f'{e.get("osm_type")}/{e.get("osm_id")}'
            t = e.get("extratags") or {}
            name = e.get("name") or (e.get("display_name") or "").split(",")[0]
            if key in seen or not name:
                continue
            seen.add(key)
            la, lo = float(e["lat"]), float(e["lon"])
            site = t.get("website") or t.get("contact:website") or t.get("url") or ""
            if site and not site.startswith("http"):
                site = "http://" + site
            a = e.get("address") or {}
            addr = ", ".join(x for x in (a.get("house_number"), a.get("road"), a.get("suburb") or a.get("city")) if x)
            out.append({"id": key, "name": name, "km": round(km(lat, lon, la, lo), 2), "website": site,
                        "phone": t.get("phone") or t.get("contact:phone") or "", "address": addr, "lat": la, "lon": lo,
                        "maps": f"https://www.google.com/maps/search/?api=1&query={la},{lo}"})
    return out


def query_overpass(lat: float, lon: float, radius_km: float, niche: str) -> list[dict]:
    tags = NICHES.get(niche.lower(), [])
    r = int(radius_km * 1000)
    parts = [f'nwr[{t.split("=")[0]}="{t.split("=")[1]}"](around:{r},{lat},{lon});' for t in tags]
    word = re.escape(niche.replace("-", " "))
    if not tags:                                   # unknown niche: match business names instead (heavier query)
        parts.append(f'nwr["name"~"{word}",i]["website"](around:{r},{lat},{lon});')
    q = f'[out:json][timeout:60];({"".join(parts)});out center tags;'
    data = json.loads(_get(OVERPASS, urllib.parse.urlencode({"data": q}).encode()))
    out = []
    for e in data.get("elements", []):
        t = e.get("tags", {})
        if not t.get("name"):
            continue
        la, lo = (e.get("lat"), e.get("lon")) if "lat" in e else (e.get("center", {}).get("lat"), e.get("center", {}).get("lon"))
        if la is None:
            continue
        site = t.get("website") or t.get("contact:website") or t.get("url") or ""
        if site and not site.startswith("http"):
            site = "http://" + site
        addr = ", ".join(x for x in (t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:suburb") or t.get("addr:city")) if x)
        out.append({"id": f'{e["type"]}/{e["id"]}', "name": t["name"], "km": round(km(lat, lon, la, lo), 2), "website": site,
                    "phone": t.get("phone") or t.get("contact:phone") or "", "address": addr, "lat": la, "lon": lo,
                    "maps": f"https://www.google.com/maps/search/?api=1&query={la},{lo}"})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("start"); ap.add_argument("niche")
    ap.add_argument("--rings", default="1,2,5,10,20,40"); ap.add_argument("--min", type=int, default=15)
    ap.add_argument("--all", action="store_true"); ap.add_argument("--out", default="leads.csv"); ap.add_argument("--score", action="store_true")
    a = ap.parse_args()
    lat, lon, where = geocode(a.start)
    print(f"start: {where} ({lat:.5f}, {lon:.5f}) - niche '{a.niche}'")
    seen, rows, inner, with_site = set(), [], 0.0, 0
    for ring in [float(x) for x in a.rings.split(",")]:
        found = [b for b in query(lat, lon, ring, a.niche) if b["id"] not in seen and b["km"] > inner - 1e-9 and b["km"] <= ring]
        found.sort(key=lambda b: b["km"])
        keep = [b for b in found if a.all or b["website"]]
        for b in found:
            seen.add(b["id"])
        print(f"\n== ring {inner:g}-{ring:g} km: {len(keep)} businesses" + ("" if a.all else " with a website"))
        for b in keep:
            b["ring_km"] = ring
            rows.append(b)
            print(f"  {b['km']:6.2f} km  {b['name'][:40]:40}  {b['website'] or '-':45.45}  {b['phone']}")
        sites = [b["website"] for b in keep if b["website"]]
        with_site += len(sites)
        if a.score and sites:
            print(f"  scoring ring {ring:g} km (nearest first)...")
            subprocess.run([sys.executable, str(Path(__file__).with_name("score_sites.py")), *sites])
        inner = ring
        if with_site >= a.min:
            print(f"\nstopped widening at {ring:g} km: {with_site} businesses with a website (--min {a.min})")
            break
    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["ring_km", "km", "name", "website", "phone", "address", "maps", "lat", "lon", "id"])
        w.writeheader(); w.writerows(rows)
    print(f"\n{len(rows)} businesses, nearest first -> {a.out}")


if __name__ == "__main__":
    main()
