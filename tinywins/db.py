from __future__ import annotations

import sqlite3
from typing import Dict, List, Tuple, Optional
import json
from datetime import date, timedelta

from . import utils


def get_connection() -> sqlite3.Connection:
    utils.ensure_data_dir()
    conn = sqlite3.connect(str(utils.get_db_path()), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS boards (
            day TEXT PRIMARY KEY,
            tasks TEXT NOT NULL,
            locale TEXT NOT NULL,
            seed INTEGER NOT NULL,
            rerolls INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS completions (
            day TEXT NOT NULL,
            task_id TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT,
            PRIMARY KEY (day, task_id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL,
            job_class TEXT,
            element TEXT,
            xp INTEGER NOT NULL DEFAULT 0,
            gems INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS milestones (
            day TEXT NOT NULL,
            key TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (day, key)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS artifacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rarity TEXT NOT NULL,
            perk_key TEXT NOT NULL,
            data_json TEXT,
            equipped INTEGER NOT NULL DEFAULT 0,
            acquired_at TEXT NOT NULL
        )
        """
    )
    conn.commit()


def get_board(day: str) -> Optional[Dict]:
    conn = get_connection()
    cur = conn.cursor()
    row = cur.execute("SELECT day, tasks, locale, seed, rerolls, created_at FROM boards WHERE day = ?", (day,)).fetchone()
    if not row:
        return None
    return {
        "day": row["day"],
        "tasks": json.loads(row["tasks"]),
        "locale": row["locale"],
        "seed": int(row["seed"]),
        "rerolls": int(row["rerolls"]),
        "created_at": row["created_at"],
    }


def create_board(day: str, tasks: List[str], locale: str, seed: int) -> Dict:
    conn = get_connection()
    cur = conn.cursor()
    data = (day, json.dumps(tasks, ensure_ascii=False), locale, int(seed), 0, utils.now_str())
    cur.execute("INSERT OR REPLACE INTO boards(day, tasks, locale, seed, rerolls, created_at) VALUES (?, ?, ?, ?, ?, ?)", data)
    conn.commit()
    return get_board(day)  # type: ignore


def update_board_reroll(day: str, tasks: List[str], seed: int) -> Dict:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE boards SET tasks = ?, seed = ?, rerolls = rerolls + 1 WHERE day = ?",
        (json.dumps(tasks, ensure_ascii=False), int(seed), day),
    )
    conn.commit()
    return get_board(day)  # type: ignore


def ensure_completions(day: str, task_ids: List[str]) -> None:
    conn = get_connection()
    cur = conn.cursor()
    for tid in task_ids:
        cur.execute(
            "INSERT OR IGNORE INTO completions(day, task_id, completed) VALUES (?, ?, 0)",
            (day, tid),
        )
    conn.commit()


def reset_day_completions(day: str, task_ids: List[str]) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM completions WHERE day = ?", (day,))
    for tid in task_ids:
        cur.execute(
            "INSERT OR IGNORE INTO completions(day, task_id, completed) VALUES (?, ?, 0)",
            (day, tid),
        )
    conn.commit()


def get_completions(day: str) -> Dict[str, bool]:
    conn = get_connection()
    cur = conn.cursor()
    rows = cur.execute("SELECT task_id, completed FROM completions WHERE day = ?", (day,)).fetchall()
    return {r["task_id"]: bool(r["completed"]) for r in rows}


def set_completion(day: str, task_id: str, completed: bool) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE completions SET completed = ?, completed_at = ? WHERE day = ? AND task_id = ?",
        (1 if completed else 0, utils.now_str() if completed else None, day, task_id),
    )
    conn.commit()


def get_stats_last_n_days(n: int = 14) -> List[Tuple[str, int]]:
    today = date.today()
    conn = get_connection()
    cur = conn.cursor()
    results: List[Tuple[str, int]] = []
    for i in range(n - 1, -1, -1):
        d = today - timedelta(days=i)
        day_str = d.isoformat()
        row = cur.execute(
            "SELECT COUNT(*) FROM completions WHERE day = ? AND completed = 1",
            (day_str,),
        ).fetchone()
        count = int(row[0]) if row else 0
        results.append((day_str, count))
    return results


def get_current_streak() -> int:
    conn = get_connection()
    cur = conn.cursor()
    streak = 0
    i = 0
    while True:
        d = date.today() - timedelta(days=i)
        day_str = d.isoformat()
        row = cur.execute(
            "SELECT COUNT(*) FROM completions WHERE day = ? AND completed = 1",
            (day_str,),
        ).fetchone()
        count = int(row[0]) if row else 0
        if count > 0:
            streak += 1
            i += 1
            continue
        break
    return streak


def get_profile():
    conn = get_connection()
    cur = conn.cursor()
    row = cur.execute("SELECT id, name, job_class, element, xp, gems, updated_at FROM profile WHERE id = 1").fetchone()
    return dict(row) if row else None


def upsert_profile(name: str, job_class: str | None, element: str | None, xp: int, gems: int) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO profile(id, name, job_class, element, xp, gems, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?)\n         ON CONFLICT(id) DO UPDATE SET name = excluded.name, job_class = excluded.job_class, element = excluded.element, xp = excluded.xp, gems = excluded.gems, updated_at = excluded.updated_at",
        (name, job_class, element, int(xp), int(gems), utils.now_str()),
    )
    conn.commit()


def add_profile_xp(delta: int) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE profile SET xp = COALESCE(xp, 0) + ?, updated_at = ? WHERE id = 1", (int(delta), utils.now_str()))
    conn.commit()


def add_profile_gems(delta: int) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE profile SET gems = COALESCE(gems, 0) + ?, updated_at = ? WHERE id = 1", (int(delta), utils.now_str()))
    conn.commit()


def add_milestone_if_absent(day: str, key: str) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO milestones(day, key, created_at) VALUES (?, ?, ?)", (day, key, utils.now_str()))
        conn.commit()
        return True
    except Exception:
        return False


# Artifacts

def add_artifact(name: str, rarity: str, perk_key: str, data_json: str | None = None) -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO artifacts(name, rarity, perk_key, data_json, equipped, acquired_at) VALUES (?, ?, ?, ?, 0, ?)",
        (name, rarity, perk_key, data_json, utils.now_str()),
    )
    conn.commit()
    return int(cur.lastrowid)


def get_artifact_by_id(artifact_id: int):
    conn = get_connection()
    cur = conn.cursor()
    row = cur.execute("SELECT id, name, rarity, perk_key, data_json, equipped, acquired_at FROM artifacts WHERE id = ?", (int(artifact_id),)).fetchone()
    return dict(row) if row else None


def list_artifacts(equipped_only: bool = False) -> list[dict]:
    conn = get_connection()
    cur = conn.cursor()
    if equipped_only:
        rows = cur.execute("SELECT id, name, rarity, perk_key, data_json, equipped, acquired_at FROM artifacts WHERE equipped = 1 ORDER BY acquired_at DESC").fetchall()
    else:
        rows = cur.execute("SELECT id, name, rarity, perk_key, data_json, equipped, acquired_at FROM artifacts ORDER BY acquired_at DESC").fetchall()
    return [dict(r) for r in rows]


def set_artifact_equipped(artifact_id: int, equipped: bool) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE artifacts SET equipped = ? WHERE id = ?", (1 if equipped else 0, int(artifact_id)))
    conn.commit()