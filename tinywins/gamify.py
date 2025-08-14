from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from . import db, utils


# ---------- Level & XP ----------

def xp_to_next_level(level: int) -> int:
    # Simple escalating curve: base 100, +20 per level
    return 100 + (level - 1) * 20


def level_from_total_xp(total_xp: int) -> Tuple[int, int, int]:
    """Return (level, current_xp_in_level, current_level_cap)."""
    level = 1
    xp_left = int(total_xp)
    while True:
        cap = xp_to_next_level(level)
        if xp_left < cap:
            return level, xp_left, cap
        xp_left -= cap
        level += 1


# ---------- Artifacts & Perks ----------

@dataclass
class Artifact:
    id: int
    name: str
    rarity: str  # common, rare, epic
    perk_key: str
    data_json: str
    equipped: bool


ARTIFACT_POOL: List[Dict] = [
    {"name": "Traveler's Charm", "rarity": "common", "perk_key": "xp_boost_5", "data": {"xp_boost_pct": 5}},
    {"name": "Streak Shell", "rarity": "rare", "perk_key": "streak_shield", "data": {"shield": 1}},
    {"name": "Reroll Token", "rarity": "common", "perk_key": "reroll_bonus", "data": {"reroll_bonus": 1}},
    {"name": "Pyro Emblem", "rarity": "rare", "perk_key": "theme_pyro", "data": {"theme": "Pyro"}},
    {"name": "Cygnus Crest", "rarity": "epic", "perk_key": "theme_cygnus", "data": {"theme": "Cygnus"}},
    {"name": "Lucky Feather", "rarity": "rare", "perk_key": "drop_boost_5", "data": {"drop_boost_pct": 5}},
]

RARITY_WEIGHTS = {"common": 70, "rare": 25, "epic": 5}


def roll_one_artifact(rnd: random.Random) -> Dict:
    # Choose rarity first
    rarities = list(RARITY_WEIGHTS.keys())
    weights = [RARITY_WEIGHTS[r] for r in rarities]
    chosen_rarity = rnd.choices(rarities, weights=weights, k=1)[0]
    # Pool by rarity
    pool = [a for a in ARTIFACT_POOL if a["rarity"] == chosen_rarity]
    if not pool:
        pool = ARTIFACT_POOL
    art = rnd.choice(pool)
    return art


# ---------- Profile & Currency ----------

def ensure_profile() -> Dict:
    prof = db.get_profile()
    if prof is None:
        db.upsert_profile(name="Traveler", job_class=None, element=None, xp=0, gems=0)
        prof = db.get_profile()
    assert prof is not None
    return prof


def set_profile(job_class: Optional[str], element: Optional[str]) -> None:
    prof = ensure_profile()
    db.upsert_profile(name=prof["name"], job_class=job_class, element=element, xp=prof["xp"], gems=prof["gems"])


def add_xp(base_xp: int) -> None:
    prof = ensure_profile()
    bonus_pct = get_equipped_xp_bonus_pct()
    gained = int(round(base_xp * (1 + bonus_pct / 100.0)))
    db.add_profile_xp(gained)


def add_gems(delta: int) -> None:
    db.add_profile_gems(delta)


def spend_gems(cost: int) -> bool:
    prof = ensure_profile()
    if prof["gems"] < cost:
        return False
    db.add_profile_gems(-cost)
    return True


def get_equipped_xp_bonus_pct() -> int:
    arts = db.list_artifacts(equipped_only=True)
    total = 0
    for a in arts:
        if a["perk_key"] == "xp_boost_5":
            try:
                data = utils.json_loads(a["data_json"]) if a["data_json"] else {}
            except Exception:
                data = {}
            total += int(data.get("xp_boost_pct", 5))
    return total


# ---------- Milestones (one-time per day) ----------

def award_task_once(day: str, task_id: str, base_xp: int = 10, gem_reward: int = 5) -> bool:
    key = f"award-{task_id}"
    if db.add_milestone_if_absent(day, key):
        add_xp(base_xp)
        add_gems(gem_reward)
        return True
    return False


# ---------- Wish (Gacha) ----------

def wish(rng_seed: Optional[int] = None, count: int = 1) -> List[Dict]:
    rnd = random.Random(rng_seed)
    results: List[Dict] = []
    for _ in range(count):
        art_template = roll_one_artifact(rnd)
        art_id = db.add_artifact(
            name=art_template["name"],
            rarity=art_template["rarity"],
            perk_key=art_template["perk_key"],
            data_json=utils.json_dumps(art_template.get("data", {})),
        )
        results.append(db.get_artifact_by_id(art_id))
    return results


def list_themes_unlocked() -> List[str]:
    themes = ["Default"]
    arts = db.list_artifacts(equipped_only=False)
    for a in arts:
        if a["perk_key"] in ("theme_pyro", "theme_cygnus"):
            try:
                data = utils.json_loads(a["data_json"]) if a["data_json"] else {}
            except Exception:
                data = {}
            theme = data.get("theme")
            if theme and theme not in themes:
                themes.append(theme)
    return themes