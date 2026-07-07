"""
FastAPI backend — serves VCT 2026 stats from vct_matches_clustered.csv
"""
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from itertools import combinations
import pandas as pd
from typing import Optional
import joblib
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://vct2026-meta-analyzer.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

REGION_MAP = {
    "VCT 2026: Americas Stage 1": "Americas",
    "VCT 2026: EMEA Stage 1": "EMEA",
    "VCT 2026: Pacific Stage 1": "Pacific",
    "VCT 2026: China Stage 1": "China",
    "Valorant Masters London 2026": "International",
}

TEAM_REGION = {
    "Evil Geniuses": "Americas", "FURIA": "Americas", "LEVIATÁN": "Americas",
    "MIBR": "Americas", "NRG": "Americas", "ENVY": "Americas",
    "100 Thieves": "Americas", "Cloud9": "Americas", "KRÜ Esports": "Americas",
    "LOUD": "Americas", "Sentinels": "Americas", "G2 Esports": "Americas",
    "BBL Esports": "EMEA", "FUT Esports": "EMEA", "Gentle Mates": "EMEA",
    "Natus Vincere": "EMEA", "Team Vitality": "EMEA", "PCIFIC Esports": "EMEA",
    "FNATIC": "EMEA", "GIANTX": "EMEA", "Karmine Corp": "EMEA",
    "Team Heretics": "EMEA", "Team Liquid": "EMEA", "Eternal Fire": "EMEA",
    "FULL SENSE": "Pacific", "Gen.G": "Pacific", "Global Esports": "Pacific",
    "Rex Regum Qeon": "Pacific", "ZETA DIVISION": "Pacific",
    "Nongshim RedForce": "Pacific", "DetonatioN FocusMe": "Pacific",
    "KIWOOM DRX": "Pacific", "Paper Rex": "Pacific", "T1": "Pacific",
    "Team Secret": "Pacific", "VARREL": "Pacific",
    "EDward Gaming": "China", "FunPlus Phoenix": "China", "JD Mall JDG Esports": "China",
    "Nova Esports": "China", "Trace Esports": "China", "TYLOO": "China",
    "All Gamers": "China", "Guangzhou Huadu Bilibili Gaming": "China",
    "Wuxi Titan Esports Club": "China", "Wolves Esports": "China",
    "Xi Lai Gaming": "China", "Dragon Ranger Gaming": "China",
}

EVENT_ORDER = [
    "VCT 2026: Americas Stage 1",
    "VCT 2026: EMEA Stage 1",
    "VCT 2026: Pacific Stage 1",
    "VCT 2026: China Stage 1",
    "Valorant Masters London 2026",
]

def load_df():
    df = pd.read_csv("data/vct_matches_clustered.csv")
    df["won"] = df["won"].astype(bool)
    df["region"] = df["event"].map(REGION_MAP)
    return df

def apply_filters(df, event, map_name, region):
    if event and event != "All":
        if event not in df["event"].unique():
            raise HTTPException(400, f"Unknown event: {event}")
        df = df[df["event"] == event]
        if event == "Valorant Masters London 2026" and region and region != "All" and region != "International":
            df = df[df["team"].map(TEAM_REGION) == region]
            if df.empty:
                raise HTTPException(400, f"No {region} teams in Masters London data")
    else:
        if region and region != "All":
            if region == "International":
                df = df[df["region"] == "International"]
            else:
                df = df[df["region"] == region]

    if map_name and map_name != "All":
        filtered = df[df["map_name"] == map_name]
        if filtered.empty:
            raise HTTPException(400, f"No data for map '{map_name}' with current filters")
        df = filtered

    return df

@app.get("/filters")
def get_filters():
    df = load_df()
    return {
        "events": ["All"] + sorted(df["event"].unique().tolist()),
        "maps": ["All"] + sorted(df["map_name"].unique().tolist()),
        "regions": ["All", "Americas", "EMEA", "Pacific", "China", "International"],
    }

@app.get("/agents")
def get_agents(
    event: Optional[str] = Query(None),
    map: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    min_picks: int = Query(1),
):
    df = load_df()
    df = apply_filters(df, event, map, region)
    if df.empty:
        return []

    rows = []
    for _, row in df.iterrows():
        for agent in row["team_comp"].split(","):
            rows.append({"agent": agent, "won": row["won"]})

    adf = pd.DataFrame(rows)
    total_slots = len(df) * 5
    stats = adf.groupby("agent").agg(
        picks=("won", "count"),
        wins=("won", "sum")
    ).reset_index()
    stats["win_rate"] = (stats["wins"] / stats["picks"]).round(3)
    stats["pick_rate"] = (stats["picks"] / total_slots * 100).round(1)
    stats = stats[stats["picks"] >= min_picks].sort_values("picks", ascending=False)
    return stats.to_dict(orient="records")

@app.get("/agents/presence")
def get_agent_presence(
    event: Optional[str] = Query(None),
    map: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    min_picks: int = Query(3),
):
    df = load_df()
    df = apply_filters(df, event, map, region)
    if df.empty:
        return []

    all_agents = set()
    for comp in df["team_comp"]:
        all_agents.update(comp.split(","))

    results = []
    for agent in sorted(all_agents):
        has_agent = df[df["team_comp"].str.contains(agent)]
        no_agent = df[~df["team_comp"].str.contains(agent)]

        if len(has_agent) < min_picks or len(no_agent) < min_picks:
            continue

        results.append({
            "agent": agent,
            "with_picks": len(has_agent),
            "with_win_rate": round(has_agent["won"].mean(), 3),
            "without_picks": len(no_agent),
            "without_win_rate": round(no_agent["won"].mean(), 3),
            "delta": round(has_agent["won"].mean() - no_agent["won"].mean(), 3),
        })

    results.sort(key=lambda x: abs(x["delta"]), reverse=True)
    return results

@app.get("/comps")
def get_comps(
    event: Optional[str] = Query(None),
    map: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    min_appearances: int = Query(3),
):
    df = load_df()
    df = apply_filters(df, event, map, region)
    if df.empty:
        return {}

    result = {}
    maps_to_show = [map] if (map and map != "All") else sorted(df["map_name"].unique())

    for map_name in maps_to_show:
        map_df = df[df["map_name"] == map_name]
        stats = map_df.groupby("team_comp").agg(
            appearances=("won", "count"),
            wins=("won", "sum")
        ).reset_index()
        stats["win_rate"] = (stats["wins"] / stats["appearances"]).round(3)
        stats = stats[stats["appearances"] >= min_appearances].sort_values(
            "win_rate", ascending=False
        )
        if not stats.empty:
            result[map_name] = stats.to_dict(orient="records")

    return result

@app.get("/presence/comp")
def get_comp_presence(
    agent: str = Query(...),
    event: Optional[str] = Query(None),
    map: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    df = load_df()
    df = apply_filters(df, event, map, region)
    if df.empty:
        return []

    results = []
    maps_to_check = [map] if (map and map != "All") else sorted(df["map_name"].unique())

    for map_name in maps_to_check:
        map_df = df[df["map_name"] == map_name]
        has_agent = map_df[map_df["team_comp"].str.contains(agent)]
        no_agent = map_df[~map_df["team_comp"].str.contains(agent)]

        if len(has_agent) < 3 and len(no_agent) < 3:
            continue

        results.append({
            "map_name": map_name,
            "agent": agent,
            "with_picks": len(has_agent),
            "with_win_rate": round(has_agent["won"].mean(), 3) if len(has_agent) >= 3 else None,
            "without_picks": len(no_agent),
            "without_win_rate": round(no_agent["won"].mean(), 3) if len(no_agent) >= 3 else None,
            "delta": round(has_agent["won"].mean() - no_agent["won"].mean(), 3) if len(has_agent) >= 3 and len(no_agent) >= 3 else None,
        })

    return results

@app.get("/counter")
def get_counter(
    event: Optional[str] = Query(None),
    map: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    opp_agent: Optional[str] = Query(None),
    min_appearances: int = Query(5),
):
    df = load_df()
    df = apply_filters(df, event, map, region)
    if df.empty:
        return []

    rows = []
    for _, row in df.iterrows():
        for my_agent in row["team_comp"].split(","):
            for opp in row["opponent_comp"].split(","):
                if my_agent != opp:
                    rows.append({
                        "my_agent": my_agent,
                        "opp_agent": opp,
                        "won": row["won"]
                    })

    if not rows:
        return []

    cdf = pd.DataFrame(rows)
    if opp_agent:
        cdf = cdf[cdf["opp_agent"] == opp_agent]

    stats = cdf.groupby(["opp_agent", "my_agent"]).agg(
        appearances=("won", "count"),
        wins=("won", "sum")
    ).reset_index()
    stats["win_rate"] = (stats["wins"] / stats["appearances"]).round(3)
    stats = stats[stats["appearances"] >= min_appearances].sort_values(
        "win_rate", ascending=False
    )
    return stats.to_dict(orient="records")

@app.get("/mirror")
def get_mirror(
    event: Optional[str] = Query(None),
    map: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    min_appearances: int = Query(3),
):
    df = load_df()
    df = apply_filters(df, event, map, region)
    if df.empty:
        return []

    rows = []
    for _, row in df.iterrows():
        team_agents = set(row["team_comp"].split(","))
        opp_agents = set(row["opponent_comp"].split(","))
        for agent in team_agents & opp_agents:
            rows.append({"agent": agent, "won": row["won"]})

    if not rows:
        return []

    mdf = pd.DataFrame(rows)
    stats = mdf.groupby("agent").agg(
        appearances=("won", "count"),
        wins=("won", "sum")
    ).reset_index()
    stats["win_rate"] = (stats["wins"] / stats["appearances"]).round(3)
    stats = stats[stats["appearances"] >= min_appearances].sort_values(
        "appearances", ascending=False
    )
    return stats.to_dict(orient="records")

@app.get("/teams")
def get_teams(
    event: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    df = load_df()
    df = apply_filters(df, event, None, region)
    if df.empty:
        return []
    return sorted(df["team"].unique().tolist())

@app.get("/team/comps")
def get_team_comps(
    team: str = Query(...),
    event: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    df = load_df()
    df = apply_filters(df, event, None, region)
    if df.empty:
        return []

    team_df = df[df["team"] == team].copy()
    if team_df.empty:
        return []

    result = []
    for _, row in team_df.iterrows():
        result.append({
            "event": row["event"],
            "date": row["date"],
            "map_name": row["map_name"],
            "opponent": row["opponent"],
            "team_comp": row["team_comp"],
            "opponent_comp": row["opponent_comp"],
            "won": bool(row["won"]),
        })

    result.sort(key=lambda x: (x["event"], x["date"], x["map_name"]))
    return result

@app.get("/meta/shift")
def get_meta_shift():
    df = load_df()
    available = df["event"].unique().tolist()
    ordered_events = [e for e in EVENT_ORDER if e in available]

    all_agents = set()
    for comp in df["team_comp"]:
        all_agents.update(comp.split(","))

    result = {}
    for event in ordered_events:
        event_df = df[df["event"] == event]
        total_slots = len(event_df) * 5
        picks: dict = {}
        for comp in event_df["team_comp"]:
            for agent in comp.split(","):
                picks[agent] = picks.get(agent, 0) + 1
        result[event] = {
            agent: round(picks.get(agent, 0) / total_slots * 100, 1)
            for agent in sorted(all_agents)
        }

    return {"events": ordered_events, "data": result}

@app.get("/synergy")
def get_synergy(
    event: Optional[str] = Query(None),
    map: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    min_together: int = Query(3),
):
    df = load_df()
    df = apply_filters(df, event, map, region)
    if df.empty:
        return []

    pair_stats: dict = {}
    for _, row in df.iterrows():
        agents = sorted(row["team_comp"].split(","))
        for a, b in combinations(agents, 2):
            key = f"{a}|{b}"
            if key not in pair_stats:
                pair_stats[key] = {"together": 0, "wins": 0}
            pair_stats[key]["together"] += 1
            pair_stats[key]["wins"] += int(row["won"])

    result = []
    for key, stats in pair_stats.items():
        if stats["together"] < min_together:
            continue
        a, b = key.split("|")
        result.append({
            "agent_a": a,
            "agent_b": b,
            "together": stats["together"],
            "win_rate": round(stats["wins"] / stats["together"], 3),
        })

    result.sort(key=lambda x: x["win_rate"], reverse=True)
    return result

@app.get("/maps/region")
def get_maps_by_region(
    event: Optional[str] = Query(None),
):
    df = load_df()
    if event and event != "All":
        df = df[df["event"] == event]

    df = df[df["region"] != "International"]

    result = {}
    for region in sorted(df["region"].unique()):
        region_df = df[df["region"] == region]
        map_counts = region_df["map_name"].value_counts()
        total = map_counts.sum()
        result[region] = {
            map_name: round(count / total * 100, 1)
            for map_name, count in map_counts.items()
        }

    return result

# Load model once at startup
_model_cache = None

def get_model():
    global _model_cache
    if _model_cache is None:
        try:
            _model_cache = joblib.load("models/win_prob_model.joblib")
        except FileNotFoundError:
            return None
    return _model_cache

@app.get("/predict")
def predict_win(
    agents: str = Query(..., description="Comma-separated list of exactly 5 agents"),
    map: str = Query(..., description="Map name"),
):
    """
    Predict win probability for a given 5-agent comp on a given map.
    Uses logistic regression trained on VCT 2026 Stage 1 + Masters London data.
    """
    model_data = get_model()
    if model_data is None:
        raise HTTPException(500, "Model not loaded — run pipeline/train_model.py first")

    agent_list = [a.strip() for a in agents.split(",")]
    if len(agent_list) != 5:
        raise HTTPException(400, f"Need exactly 5 agents, got {len(agent_list)}")

    all_agents = model_data["all_agents"]
    all_maps = model_data["all_maps"]
    model = model_data["model"]

    # Validate agents
    unknown = [a for a in agent_list if a not in all_agents]
    if unknown:
        raise HTTPException(400, f"Unknown agents: {unknown}. Valid: {all_agents}")

    if map not in all_maps:
        raise HTTPException(400, f"Unknown map: {map}. Valid: {all_maps}")

    # Build feature vector
    agent_features = np.zeros(len(all_agents), dtype=int)
    for agent in agent_list:
        agent_features[all_agents.index(agent)] = 1

    map_features = np.zeros(len(all_maps), dtype=int)
    map_features[all_maps.index(map)] = 1

    X = np.hstack([agent_features, map_features]).reshape(1, -1)

    win_prob = float(model.predict_proba(X)[0][1])

    # Feature contributions for explainability
    feature_names = model_data["feature_names"]
    coefs = model.coef_[0]
    active_features = list(agent_list) + [f"map_{map}"]
    contributions = []
    for fname, coef in zip(feature_names, coefs):
        agent_name = fname.replace("map_", "")
        if fname in active_features or f"map_{fname.replace('map_', '')}" in active_features:
            contributions.append({
                "feature": fname,
                "coefficient": round(float(coef), 3),
                "direction": "positive" if coef > 0 else "negative"
            })

    contributions.sort(key=lambda x: abs(x["coefficient"]), reverse=True)

    return {
        "agents": agent_list,
        "map": map,
        "win_probability": round(win_prob, 3),
        "win_probability_pct": round(win_prob * 100, 1),
        "model_cv_accuracy": round(model_data["cv_accuracy"], 3),
        "note": "Prediction based on comp/map patterns only. Does not account for player skill, side, or opponent comp.",
        "feature_contributions": contributions[:10],
    }

@app.get("/model/info")
def get_model_info():
    """Returns model metadata — CV accuracy, feature count, training size."""
    model_data = get_model()
    if model_data is None:
        raise HTTPException(500, "Model not loaded")
    return {
        "cv_accuracy": round(model_data["cv_accuracy"], 3),
        "agents": model_data["all_agents"],
        "maps": model_data["all_maps"],
        "n_features": len(model_data["feature_names"]),
        "model_type": "Logistic Regression",
    }