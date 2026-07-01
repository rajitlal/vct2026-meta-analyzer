"""
Data pipeline: for each known Tier 1 VCT 2026 event, fetches all match IDs,
then fetches per-map agent comps for both teams, and saves to CSV.
Scope: All 4 Stage 1s + Masters London only (post-agent-meta-change).
"""
import requests
import time
import csv

BASE_URL = "http://127.0.0.1:3001"

# Stage 1s + Masters London only — Kickoffs and Masters Santiago dropped
TIER1_EVENTS = {
    2860: "VCT 2026: Americas Stage 1",
    2863: "VCT 2026: EMEA Stage 1",
    2775: "VCT 2026: Pacific Stage 1",
    2864: "VCT 2026: China Stage 1",
    2765: "Valorant Masters London 2026",
}

TIER1_TEAMS = {
    # China
    "EDward Gaming", "FunPlus Phoenix", "JD Mall JDG Esports", "Nova Esports",
    "Trace Esports", "TYLOO", "All Gamers", "Guangzhou Huadu Bilibili Gaming",
    "Wuxi Titan Esports Club", "Wolves Esports", "Xi Lai Gaming", "Dragon Ranger Gaming",
    # EMEA
    "BBL Esports", "FUT Esports", "Gentle Mates", "Natus Vincere", "Team Vitality",
    "PCIFIC Esports", "FNATIC", "GIANTX", "Karmine Corp", "Team Heretics",
    "Team Liquid", "Eternal Fire",
    # Pacific
    "FULL SENSE", "Gen.G", "Global Esports", "Rex Regum Qeon", "ZETA DIVISION",
    "Nongshim RedForce", "DetonatioN FocusMe", "KIWOOM DRX", "Paper Rex", "T1",
    "Team Secret", "VARREL",
    # Americas
    "Evil Geniuses", "FURIA", "LEVIATÁN", "MIBR", "NRG", "ENVY", "100 Thieves",
    "Cloud9", "KRÜ Esports", "LOUD", "Sentinels", "G2 Esports",
}

def fetch_with_retry(url, params=None, max_retries=5, base_delay=3):
    retryable_codes = {429, 500, 502, 503, 504}
    for attempt in range(max_retries):
        resp = requests.get(url, params=params)
        if resp.status_code in retryable_codes:
            wait = base_delay * (attempt + 1)
            print(f"  Got {resp.status_code}, waiting {wait}s before retry...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp
    raise Exception(f"Gave up after {max_retries} retries")

def fetch_event_match_ids(event_id):
    resp = fetch_with_retry(
        f"{BASE_URL}/v2/events/matches",
        params={"event_id": event_id}
    )
    data = resp.json()
    segments = data.get("data", {}).get("segments", [])
    return [m["match_id"] for m in segments if m.get("match_id")]

def fetch_match_details(match_id):
    resp = fetch_with_retry(
        f"{BASE_URL}/v2/match/details",
        params={"match_id": match_id},
    )
    data = resp.json().get("data", {})
    if isinstance(data, dict) and "match_id" in data:
        return data
    segments = data.get("segments", [])
    return segments[0] if segments else None

def parse_match_into_rows(match_obj, event_label):
    rows = []
    teams_meta = match_obj.get("teams", [])
    team1_name = teams_meta[0]["name"] if len(teams_meta) > 0 else ""
    team2_name = teams_meta[1]["name"] if len(teams_meta) > 1 else ""

    if team1_name not in TIER1_TEAMS or team2_name not in TIER1_TEAMS:
        return rows

    date_str = match_obj.get("date", "")

    for game_map in match_obj.get("maps", []):
        map_name = game_map.get("map_name", "")

        if not map_name or map_name.lower() in ("tbd", ""):
            continue

        score = game_map.get("score", {})
        score_t1 = score.get("team1")
        score_t2 = score.get("team2")

        if score_t1 is None or score_t2 is None:
            continue

        if isinstance(score_t1, dict):
            score_t1 = score_t1.get("total", 0)
        if isinstance(score_t2, dict):
            score_t2 = score_t2.get("total", 0)

        if score_t1 == 0 and score_t2 == 0:
            continue

        team1_won = score_t1 > score_t2

        team1_agents = [p["agent"] for p in game_map.get("players", {}).get("team1", [])]
        team2_agents = [p["agent"] for p in game_map.get("players", {}).get("team2", [])]

        if len(team1_agents) != 5 or len(team2_agents) != 5:
            continue

        rows.append({
            "match_id": match_obj.get("match_id"),
            "event": event_label,
            "date": date_str,
            "map_name": map_name,
            "team": team1_name,
            "opponent": team2_name,
            "team_comp": ",".join(sorted(team1_agents)),
            "opponent_comp": ",".join(sorted(team2_agents)),
            "won": team1_won,
        })
        rows.append({
            "match_id": match_obj.get("match_id"),
            "event": event_label,
            "date": date_str,
            "map_name": map_name,
            "team": team2_name,
            "opponent": team1_name,
            "team_comp": ",".join(sorted(team2_agents)),
            "opponent_comp": ",".join(sorted(team1_agents)),
            "won": not team1_won,
        })
    return rows

def main():
    all_rows = []
    seen_match_ids = set()

    for event_id, event_label in TIER1_EVENTS.items():
        print(f"\n{'='*60}")
        print(f"Event: {event_label} (id={event_id})")

        try:
            match_ids = fetch_event_match_ids(event_id)
        except Exception as e:
            print(f"  Failed to fetch match list: {e}")
            continue

        print(f"  Found {len(match_ids)} matches")

        for match_id in match_ids:
            if match_id in seen_match_ids:
                continue
            seen_match_ids.add(match_id)

            try:
                match_obj = fetch_match_details(match_id)
            except Exception as e:
                print(f"  Failed details for {match_id}: {e}")
                time.sleep(5)
                continue

            if match_obj is None:
                print(f"  No data for {match_id}, skipping")
                continue

            rows = parse_match_into_rows(match_obj, event_label)

            teams = match_obj.get("teams", [])
            t1 = teams[0]["name"] if teams else "?"
            t2 = teams[1]["name"] if len(teams) > 1 else "?"

            if rows:
                all_rows.extend(rows)
                print(f"  ✓ {match_id}: {t1} vs {t2} → {len(rows)//2} maps")
            else:
                print(f"  ✗ {match_id}: {t1} vs {t2} → skipped")

            time.sleep(3)  # increased from 1s to avoid 429s

    print(f"\n{'='*60}")
    print(f"Total map rows collected: {len(all_rows)}")

    if all_rows:
        with open("data/vct_matches_raw.csv", "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=all_rows[0].keys())
            writer.writeheader()
            writer.writerows(all_rows)
        print("Saved to data/vct_matches_raw.csv")
    else:
        print("No rows collected — nothing saved.")

if __name__ == "__main__":
    main()