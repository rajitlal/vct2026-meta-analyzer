"""
Step 1: Discover VCT Tier 1 event IDs.
- Pulls completed/upcoming events and filters to VCT 2026 Stage/Kickoff events
- Also searches directly for Masters events (London, Santiago) since they use
  a different naming convention and don't appear in the standard events list
- Saves tier1_events.json for reference (pull_data.py uses hardcoded IDs from this)
"""

import requests
import json

BASE_URL = "http://127.0.0.1:3001"

# Tier 1 VCT international event types we care about
TIER1_KEYWORDS = [
    "stage 1",
    "stage 2",
    "stage 3",
    "masters",
    "kickoff",
]

# Only 2026
TARGET_YEARS = ["2026"]

# Masters events found via /v2/search (different naming convention, won't appear
# in the standard events list filter, so we hardcode their IDs here)
MASTERS_EVENTS = [
    {"id": "2760", "title": "Valorant Masters Santiago 2026", "status": "completed", "dates": "Feb 28—Mar 15"},
    {"id": "2765", "title": "Valorant Masters London 2026",   "status": "completed", "dates": "Jun 5—Jun 21"},
]


def fetch_all_events():
    """Pull completed + upcoming + live events from the API."""
    events = []

    for q in ["completed", "upcoming", "live"]:
        page = 1
        while True:
            resp = requests.get(f"{BASE_URL}/v2/events", params={"q": q, "page": page})
            if resp.status_code != 200:
                break

            data = resp.json()
            segments = data.get("data", {}).get("segments", [])
            if not segments:
                break

            events.extend(segments)
            print(f"  [{q}] page {page}: got {len(segments)} events")

            if len(segments) < 10:
                break
            page += 1

    return events


def is_tier1_international(event: dict) -> bool:
    """Return True if this event is a Tier 1 VCT Stage, Kickoff, or Masters in 2026."""
    title = event.get("title", "").lower()

    has_year = any(year in title for year in TARGET_YEARS)
    if not has_year:
        return False

    is_vct = "champions tour" in title or "vct" in title
    is_tier1 = any(keyword in title for keyword in TIER1_KEYWORDS)

    return is_vct and is_tier1


def main():
    print("Fetching all events from vlrggapi...")
    all_events = fetch_all_events()
    print(f"\nTotal events fetched: {len(all_events)}")

    # Filter standard VCT events
    tier1_events = [e for e in all_events if is_tier1_international(e)]

    # Remove Stage 2 events (not completed yet)
    tier1_events = [e for e in tier1_events if "stage 2" not in e.get("title", "").lower()]

    # Add Masters events (found via search, different naming convention)
    for m in MASTERS_EVENTS:
        already_present = any(e.get("url_path", "").endswith(f"/{m['id']}/") or
                              m["id"] in e.get("url_path", "") for e in tier1_events)
        if not already_present:
            tier1_events.append({
                "title": m["title"],
                "status": m["status"],
                "dates": m["dates"],
                "url_path": f"https://www.vlr.gg/event/{m['id']}/{m['title'].lower().replace(' ', '-')}",
            })

    print(f"\nTier 1 VCT 2026 events found: {len(tier1_events)}")
    print("-" * 60)
    for event in tier1_events:
        print(f"  Title : {event.get('title')}")
        print(f"  Status: {event.get('status')}")
        print(f"  Dates : {event.get('dates')}")
        print(f"  URL   : {event.get('url_path')}")
        print()

    # Save both for reference
    with open("data/all_events_raw.json", "w") as f:
        json.dump(all_events, f, indent=2)
    print(f"Saved all {len(all_events)} raw events to data/all_events_raw.json")

    with open("data/tier1_events.json", "w") as f:
        json.dump(tier1_events, f, indent=2)
    print(f"Saved {len(tier1_events)} tier1 events to data/tier1_events.json")


if __name__ == "__main__":
    main()