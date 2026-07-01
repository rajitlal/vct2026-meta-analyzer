"""
Phase 3: VCT 2026 Meta Analysis
- Agent pick rates (global, per map, per event)
- Comp win rates (with sample size filter)
- Mirror vs non-mirror win rates
- Counter-pick analysis
- K-means clustering of comp archetypes
"""
import pandas as pd
import numpy as np
from collections import Counter
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings("ignore")

# ── Load data ──────────────────────────────────────────────
df = pd.read_csv("data/vct_matches_clean.csv")
df["won"] = df["won"].astype(bool)
df["agents"] = df["team_comp"].apply(lambda x: x.split(","))
df["opp_agents"] = df["opponent_comp"].apply(lambda x: x.split(","))

print(f"Loaded {len(df)} rows | {df['event'].nunique()} events | {df['map_name'].nunique()} maps\n")

MIN_SAMPLES = 10  # minimum appearances to show a win rate

# ══════════════════════════════════════════════════════════
# 1. AGENT PICK RATES
# ══════════════════════════════════════════════════════════
print("=" * 60)
print("1. AGENT PICK RATES (global)")
print("=" * 60)

all_agent_picks = []
for _, row in df.iterrows():
    for agent in row["agents"]:
        all_agent_picks.append({"agent": agent, "won": row["won"]})

agent_df = pd.DataFrame(all_agent_picks)
agent_stats = agent_df.groupby("agent").agg(
    picks=("won", "count"),
    wins=("won", "sum")
).reset_index()
agent_stats["win_rate"] = (agent_stats["wins"] / agent_stats["picks"]).round(3)
agent_stats["pick_rate"] = (agent_stats["picks"] / (len(df) * 5) * 100).round(1)
agent_stats = agent_stats.sort_values("picks", ascending=False)

print(agent_stats[agent_stats["picks"] >= MIN_SAMPLES].to_string(index=False))

# ── Per-map agent pick rates ───────────────────────────────
print("\n--- Top 3 agents per map ---")
for map_name in sorted(df["map_name"].unique()):
    map_df = df[df["map_name"] == map_name]
    picks = Counter()
    for agents in map_df["agents"]:
        picks.update(agents)
    total = sum(picks.values())
    top3 = picks.most_common(3)
    top3_str = ", ".join(f"{a}({c/total*100:.0f}%)" for a, c in top3)
    print(f"  {map_name:<12} {top3_str}")

# ══════════════════════════════════════════════════════════
# 2. COMP WIN RATES
# ══════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("2. COMP WIN RATES (min", MIN_SAMPLES, "appearances)")
print("=" * 60)

comp_stats = df.groupby(["map_name", "team_comp"]).agg(
    appearances=("won", "count"),
    wins=("won", "sum")
).reset_index()
comp_stats["win_rate"] = (comp_stats["wins"] / comp_stats["appearances"]).round(3)
comp_stats = comp_stats[comp_stats["appearances"] >= MIN_SAMPLES].sort_values(
    "win_rate", ascending=False
)

print("\nTop 15 highest win rate comps (filtered to min appearances):")
print(comp_stats.head(15)[["map_name", "team_comp", "appearances", "win_rate"]].to_string(index=False))

print("\nBottom 10 lowest win rate comps:")
print(comp_stats.tail(10)[["map_name", "team_comp", "appearances", "win_rate"]].to_string(index=False))

# ══════════════════════════════════════════════════════════
# 3. MIRROR vs NON-MIRROR WIN RATES
# ══════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("3. MIRROR vs NON-MIRROR ANALYSIS")
print("=" * 60)

# Full comp mirror (both teams ran identical comps)
df["is_comp_mirror"] = df["team_comp"] == df["opponent_comp"]

# Agent-level mirror: does this agent appear on both sides?
def agent_mirrors(row):
    shared = set(row["agents"]) & set(row["opp_agents"])
    return list(shared)

df["mirror_agents"] = df.apply(agent_mirrors, axis=1)
df["mirror_count"] = df["mirror_agents"].apply(len)

# Full comp mirrors
mirrors = df[df["is_comp_mirror"]]
non_mirrors = df[~df["is_comp_mirror"]]
print(f"\nFull comp mirrors: {len(mirrors)} rows")
print(f"Non-mirrors:       {len(non_mirrors)} rows")
if len(mirrors) > 0:
    print(f"Mirror win rate (team1 perspective): {mirrors['won'].mean():.3f} (should be ~0.5)")

# Agent-level mirror win rates
print("\n--- Agent mirror win rates (agent appears on both teams) ---")
mirror_rows = []
for _, row in df.iterrows():
    for agent in row["mirror_agents"]:
        mirror_rows.append({"agent": agent, "won": row["won"]})

if mirror_rows:
    mirror_agent_df = pd.DataFrame(mirror_rows)
    mirror_agent_stats = mirror_agent_df.groupby("agent").agg(
        mirror_appearances=("won", "count"),
        wins=("won", "sum")
    ).reset_index()
    mirror_agent_stats["win_rate"] = (mirror_agent_stats["wins"] / mirror_agent_stats["mirror_appearances"]).round(3)
    mirror_agent_stats = mirror_agent_stats[mirror_agent_stats["mirror_appearances"] >= 5].sort_values(
        "mirror_appearances", ascending=False
    )
    print(mirror_agent_stats.to_string(index=False))

# ══════════════════════════════════════════════════════════
# 4. COUNTER-PICK ANALYSIS
# ══════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("4. COUNTER-PICK ANALYSIS")
print("=" * 60)
print("(Given opponent runs agent X, how does your agent Y perform?)")

counter_rows = []
for _, row in df.iterrows():
    for opp_agent in row["opp_agents"]:
        for my_agent in row["agents"]:
            if my_agent != opp_agent:  # exclude mirrors
                counter_rows.append({
                    "my_agent": my_agent,
                    "opp_agent": opp_agent,
                    "won": row["won"]
                })

counter_df = pd.DataFrame(counter_rows)
counter_stats = counter_df.groupby(["opp_agent", "my_agent"]).agg(
    appearances=("won", "count"),
    wins=("won", "sum")
).reset_index()
counter_stats["win_rate"] = (counter_stats["wins"] / counter_stats["appearances"]).round(3)
counter_stats = counter_stats[counter_stats["appearances"] >= MIN_SAMPLES].sort_values(
    "win_rate", ascending=False
)

print("\nTop 15 best counter-pick combinations (my_agent beats opp_agent):")
print(counter_stats.head(15).to_string(index=False))

# ══════════════════════════════════════════════════════════
# 5. K-MEANS CLUSTERING
# ══════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("5. COMP ARCHETYPE CLUSTERING (k-means)")
print("=" * 60)

# One-hot encode agent comps
mlb = MultiLabelBinarizer()
X = mlb.fit_transform(df["agents"])
agent_names = mlb.classes_

# Find optimal k (try 4-8)
print("\nInertia by k (lower = tighter clusters):")
for k in range(4, 9):
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(X)
    print(f"  k={k}: inertia={km.inertia_:.1f}")

# Use k=6
K = 6
km = KMeans(n_clusters=K, random_state=42, n_init=10)
df["cluster"] = km.fit_predict(X)

print(f"\n--- k={K} cluster profiles ---")
for cluster_id in range(K):
    cluster_df = df[df["cluster"] == cluster_id]
    # Find top agents in this cluster
    picks = Counter()
    for agents in cluster_df["agents"]:
        picks.update(agents)
    top_agents = [a for a, _ in picks.most_common(6)]
    win_rate = cluster_df["won"].mean()
    size = len(cluster_df)
    print(f"\n  Cluster {cluster_id} ({size} rows, win_rate={win_rate:.3f}):")
    print(f"    Top agents: {', '.join(top_agents)}")
    # Most common comp in cluster
    top_comp = cluster_df["team_comp"].value_counts().index[0]
    print(f"    Most common comp: {top_comp}")

# Save clustered data
df.drop(columns=["agents", "opp_agents", "mirror_agents"], inplace=True)
df.to_csv("data/vct_matches_clustered.csv", index=False)
print("\nSaved clustered data to data/vct_matches_clustered.csv")
print("\nAnalysis complete.")