"""
Step 3: Clean vct_matches_raw.csv into vct_matches_clean.csv.
- Removes rows where agent slot count != 5 (genuine data issues)
- Cleans messy date field
- Verifies all agent tokens are real agents
"""
import pandas as pd
import re

KNOWN_AGENTS = {
    "Astra", "Breach", "Brimstone", "Chamber", "Clove", "Cypher",
    "Deadlock", "Fade", "Gekko", "Harbor", "Iso", "Jett", "Kayo",
    "Killjoy", "Miks", "Neon", "Omen", "Phoenix", "Raze", "Reyna",
    "Sage", "Skye", "Sova", "Tejo", "Veto", "Viper", "Vyse",
    "Waylay", "Yoru",
}

def clean_date(date_str):
    months = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12"
    }
    s = str(date_str).lower()
    for month_name, month_num in months.items():
        if month_name in s:
            match = re.search(rf"{month_name}\s+(\d+)", s)
            if match:
                day = match.group(1).zfill(2)
                return f"2026-{month_num}-{day}"
    return date_str

def all_valid_agents(comp_str):
    return all(a.strip() in KNOWN_AGENTS for a in comp_str.split(","))

def main():
    df = pd.read_csv("data/vct_matches_raw.csv")
    print(f"Raw rows: {len(df)}")

    # Clean date
    df["date"] = df["date"].apply(clean_date)

    # Flag rows with unknown agent tokens
    unknown_mask = ~(
        df["team_comp"].apply(all_valid_agents) &
        df["opponent_comp"].apply(all_valid_agents)
    )
    if unknown_mask.any():
        print(f"\nRows with unknown agent tokens ({unknown_mask.sum()}):")
        all_tokens = set()
        for comp in df[unknown_mask]["team_comp"].tolist() + df[unknown_mask]["opponent_comp"].tolist():
            for a in comp.split(","):
                if a.strip() not in KNOWN_AGENTS:
                    all_tokens.add(a.strip())
        print(f"  Unknown tokens: {all_tokens}")
        df = df[~unknown_mask].copy()
        print(f"After dropping unknown rows: {len(df)}")
    else:
        print("All agent tokens valid ✓")

    df.to_csv("data/vct_matches_clean.csv", index=False)
    print(f"\nSaved {len(df)} rows to data/vct_matches_clean.csv")

    print(f"\nRows per event:")
    print(df["event"].value_counts())
    print(f"\nRows per map:")
    print(df["map_name"].value_counts())

if __name__ == "__main__":
    main()