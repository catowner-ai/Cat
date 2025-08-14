from __future__ import annotations

from typing import Dict


LANG_OPTIONS: Dict[str, str] = {
    "zh-TW": "繁體中文",
    "en": "English",
    "es": "Español",
}


TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "app_title": {
        "zh-TW": "TinyWins 微任務棋盤",
        "en": "TinyWins — Micro Wins Board",
        "es": "TinyWins — Tablero de Micro Logros",
    },
    "tagline": {
        "zh-TW": "每天 3x3 小任務，累積大成就",
        "en": "A daily 3x3 of tiny tasks. Big momentum.",
        "es": "Un 3x3 diario de micro tareas. Gran impulso.",
    },
    "choose_language": {
        "zh-TW": "介面語言",
        "en": "Language",
        "es": "Idioma",
    },
    "select_date": {
        "zh-TW": "選擇日期",
        "en": "Select date",
        "es": "Seleccionar fecha",
    },
    "reroll": {
        "zh-TW": "重擲棋盤",
        "en": "Reroll Board",
        "es": "Re-lanzar tablero",
    },
    "seed_label": {
        "zh-TW": "種子",
        "en": "Seed",
        "es": "Semilla",
    },
    "rerolls_label": {
        "zh-TW": "重擲次數",
        "en": "Rerolls",
        "es": "Reintentos",
    },
    "download_share_card": {
        "zh-TW": "下載分享卡",
        "en": "Download Share Card",
        "es": "Descargar tarjeta para compartir",
    },
    "download_calendar": {
        "zh-TW": "匯出行事曆 (ICS)",
        "en": "Export Calendar (ICS)",
        "es": "Exportar calendario (ICS)",
    },
    "streak_label": {
        "zh-TW": "連勝天數",
        "en": "Streak",
        "es": "Racha",
    },
    "last_14_days": {
        "zh-TW": "最近 14 天完成數",
        "en": "Last 14 days completions",
        "es": "Completados últimos 14 días",
    },
    "board_for": {
        "zh-TW": "今日棋盤",
        "en": "Today's board",
        "es": "Tablero de hoy",
    },
    "tasks_completed": {
        "zh-TW": "已完成",
        "en": "Completed",
        "es": "Completado",
    },
    "made_with_love": {
        "zh-TW": "Made with ❤️",
        "en": "Made with ❤️",
        "es": "Hecho con ❤️",
    },
    "board_rerolled": {
        "zh-TW": "已重擲今日棋盤！",
        "en": "Today's board rerolled!",
        "es": "¡Tablero de hoy re-lanzado!",
    },
}


def t(locale: str, key: str, default: str | None = None) -> str:
    table = TRANSLATIONS.get(key) or {}
    if locale in table:
        return table[locale]
    if "en" in table:
        return table["en"]
    return default if default is not None else key