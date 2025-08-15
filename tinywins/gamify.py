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
    state = db.get_gacha_state()
    pity_rare = state["pity_rare"]
    pity_epic = state["pity_epic"]
    for _ in range(count):
        # pity: guarantee rare at 10, epic at 50
        # adjust weights if close to pity
        local_weights = dict(RARITY_WEIGHTS)
        if pity_epic >= 49:
            local_weights = {"common": 0, "rare": 0, "epic": 100}
        elif pity_rare >= 9:
            local_weights = {"common": 0, "rare": 100, "epic": 0}
        else:
            # small soft pity bumps
            local_weights["rare"] += min(10, pity_rare)
            local_weights["epic"] += min(5, pity_epic // 5)
        # sample with adjusted weights
        rarities = list(local_weights.keys())
        weights = [local_weights[r] for r in rarities]
        chosen_rarity = rnd.choices(rarities, weights=weights, k=1)[0]
        pool = [a for a in ARTIFACT_POOL if a["rarity"] == chosen_rarity]
        if not pool:
            pool = ARTIFACT_POOL
        art_template = rnd.choice(pool)
        art_id = db.add_artifact(
            name=art_template["name"],
            rarity=art_template["rarity"],
            perk_key=art_template["perk_key"],
            data_json=utils.json_dumps(art_template.get("data", {})),
        )
        results.append(db.get_artifact_by_id(art_id))
        # log wish
        db.log_wish(art_template["name"], art_template["rarity"], art_template["perk_key"])
        # update pity
        if chosen_rarity == "epic":
            pity_epic = 0
            pity_rare = 0
        elif chosen_rarity == "rare":
            pity_rare = 0
            pity_epic += 1
        else:
            pity_rare += 1
            pity_epic += 1
    db.set_gacha_state(pity_rare=pity_rare, pity_epic=pity_epic)
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


# ---------- Daily Login & Commissions ----------

DAILY_LOGIN_KEY = "daily-login"
COMMISSION_KEYS = ["commission-1", "commission-2", "commission-3"]


def claim_daily_login(day: str) -> bool:
    if db.add_milestone_if_absent(day, DAILY_LOGIN_KEY):
        add_gems(20)
        add_xp(30)
        return True
    return False


def generate_commissions(day: str) -> List[Dict]:
    rnd = random.Random(hash(day) & 0xFFFFFFFF)
    pool = ARTIFACT_POOL
    # Use tasks catalog as pseudo commissions titles by id
    titles = [
        "Complete 5 tasks",
        "Share your board",
        "Finish 1 commission",
        "Clear inbox 5",
        "Walk 10 minutes",
        "Journal 5 lines",
    ]
    rnd.shuffle(titles)
    commissions = titles[:3]
    items: List[Dict] = []
    for i, title in enumerate(commissions):
        key = COMMISSION_KEYS[i]
        items.append({"key": key, "title": title})
    return items


def claim_commission(day: str, key: str) -> bool:
    if db.add_milestone_if_absent(day, key):
        add_gems(12)
        add_xp(20)
        return True
    return False


# ---------- Talents & Combos ----------

TALENT_DEFS = {
    "combo_mastery": {"name": "Combo Mastery", "max": 5, "xp_bonus_per_level": 2},
    "elemental_attunement": {"name": "Elemental Attunement", "max": 5, "gem_bonus_per_level": 1},
}


def get_talents() -> dict:
    return db.get_talents()


def upgrade_talent(key: str) -> bool:
    defs = TALENT_DEFS.get(key)
    if not defs:
        return False
    level = db.get_talent_level(key)
    if level >= int(defs["max"]):
        return False
    # simple cost: 20 gems per level
    if not spend_gems(20):
        return False
    db.set_talent_level(key, level + 1)
    return True


def apply_combo_bonus(day: str, recently_completed: list[dict]) -> None:
    # If two tasks completed within the last two completions, grant small bonus
    if len(recently_completed) >= 2:
        tdefs = TALENT_DEFS["combo_mastery"]
        level = db.get_talent_level("combo_mastery")
        xp_bonus = level * int(tdefs["xp_bonus_per_level"]) if level > 0 else 0
        if xp_bonus > 0:
            add_xp(xp_bonus)


# ---------- Weekly Boss ----------

WEEKLY_BOSS_KEY = "weekly-boss"


def can_claim_weekly_boss(day: str) -> bool:
    # allow claiming once per calendar week (Mon-Sun)
    # We mark key as WEEKLY_BOSS_KEY-YYYY-WW (ISO week)
    from datetime import datetime

    dt = datetime.strptime(day, "%Y-%m-%d")
    week_key = f"{WEEKLY_BOSS_KEY}-{dt.isocalendar().year}-{dt.isocalendar().week}"
    # Use a fixed milestone day bucket so it's truly once per week
    return db.add_milestone_if_absent("weekly", week_key)


def claim_weekly_boss_reward(day: str) -> bool:
    # Grant a bigger reward
    if can_claim_weekly_boss(day):
        add_gems(80)
        add_xp(120)
        return True
    return False