from __future__ import annotations

from pathlib import Path
from datetime import datetime, date
import json
from typing import Any


_PROJECT_ROOT = Path(__file__).resolve().parents[1]
_DATA_DIR = _PROJECT_ROOT / "data"
_DB_PATH = _DATA_DIR / "tinywins.db"


def get_project_root() -> Path:
    return _PROJECT_ROOT


def get_data_dir() -> Path:
    return _DATA_DIR


def ensure_data_dir() -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_db_path() -> Path:
    return _DB_PATH


def today_str() -> str:
    return date.today().isoformat()


def now_str() -> str:
    return datetime.now().isoformat(timespec="seconds")


def json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def json_loads(s: str) -> Any:
    return json.loads(s)