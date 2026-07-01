"""
Trains a logistic regression win probability model.

Features:
- One-hot encoded agents (29 binary features — 1 if agent in comp, 0 if not)
- One-hot encoded map (8 binary features)

Target: won (1/0)

We train on both perspectives per map game (team A and team B rows are both
in the dataset, so the model sees both winning and losing sides of every game).

Output: saves model + feature metadata to models/win_prob_model.joblib
"""
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import OneHotEncoder
import joblib
import os

os.makedirs("models", exist_ok=True)

# Load data
df = pd.read_csv("data/vct_matches_clustered.csv")
df["won"] = df["won"].astype(int)

# Get all unique agents and maps
all_agents = sorted(set(
    agent
    for comp in df["team_comp"]
    for agent in comp.split(",")
))
all_maps = sorted(df["map_name"].unique())

print(f"Agents ({len(all_agents)}): {all_agents}")
print(f"Maps ({len(all_maps)}): {all_maps}")
print(f"Training rows: {len(df)}")

def build_features(df, all_agents, all_maps):
    """
    For each row, build a feature vector:
    - 29 binary features for agents (1 = agent in comp)
    - 8 binary features for map (one-hot)
    """
    # Agent features
    agent_features = np.zeros((len(df), len(all_agents)), dtype=int)
    for i, comp in enumerate(df["team_comp"]):
        for agent in comp.split(","):
            if agent in all_agents:
                agent_features[i, all_agents.index(agent)] = 1

    # Map features (one-hot)
    map_features = np.zeros((len(df), len(all_maps)), dtype=int)
    for i, map_name in enumerate(df["map_name"]):
        if map_name in all_maps:
            map_features[i, all_maps.index(map_name)] = 1

    return np.hstack([agent_features, map_features])

X = build_features(df, all_agents, all_maps)
y = df["won"].values

print(f"\nFeature matrix shape: {X.shape}")

# Cross-validate before training final model
print("\nRunning 5-fold cross-validation...")
model = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
print(f"CV Accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
print(f"CV Scores: {[round(s, 3) for s in cv_scores]}")

# Note: ~50% accuracy is expected and correct — this is a balanced binary
# classification problem. The model learns which comps/maps correlate with
# winning, but predicting match outcomes is inherently noisy.
# The value is in relative probabilities, not absolute accuracy.

# Train final model on all data
model.fit(X, y)
print(f"\nTrain accuracy: {model.score(X, y):.3f}")

# Feature importance — which agents/maps matter most
feature_names = all_agents + [f"map_{m}" for m in all_maps]
coefs = model.coef_[0]
importance = sorted(zip(feature_names, coefs), key=lambda x: abs(x[1]), reverse=True)

print("\nTop 15 most influential features:")
for name, coef in importance[:15]:
    direction = "↑ win" if coef > 0 else "↓ win"
    print(f"  {name:<35} {coef:+.3f}  {direction}")

# Save model + metadata
joblib.dump({
    "model": model,
    "all_agents": all_agents,
    "all_maps": all_maps,
    "feature_names": feature_names,
    "cv_accuracy": cv_scores.mean(),
}, "models/win_prob_model.joblib")

print("\nSaved to models/win_prob_model.joblib")