from __future__ import annotations

import random
from typing import Dict, List


AVAILABLE_LOCALES = ["zh-TW", "en", "es"]


# Each task has a stable id and localized texts
TASKS_CATALOG: List[Dict] = [
    {"id": "water", "texts": {"zh-TW": "喝一杯溫水", "en": "Drink a glass of water", "es": "Bebe un vaso de agua"}, "cat": "body"},
    {"id": "stretch", "texts": {"zh-TW": "伸展 2 分鐘", "en": "Stretch for 2 minutes", "es": "Estírate 2 minutos"}, "cat": "body"},
    {"id": "breathe", "texts": {"zh-TW": "方塊呼吸 2 分鐘", "en": "Box breathing 2 minutes", "es": "Respiración en caja 2 min"}, "cat": "mind"},
    {"id": "gratitude", "texts": {"zh-TW": "寫下 1 件感謝", "en": "Write 1 thing you're grateful for", "es": "Escribe 1 cosa por la que agradeces"}, "cat": "mind"},
    {"id": "walk5", "texts": {"zh-TW": "走路 5 分鐘", "en": "Walk for 5 minutes", "es": "Camina 5 minutos"}, "cat": "body"},
    {"id": "sunlight", "texts": {"zh-TW": "看自然光 2 分鐘", "en": "Get 2 minutes of sunlight", "es": "Toma 2 minutos de sol"}, "cat": "body"},
    {"id": "desk_clean", "texts": {"zh-TW": "清理桌面 5 件物品", "en": "Clear 5 items from desk", "es": "Limpia 5 cosas del escritorio"}, "cat": "home"},
    {"id": "declutter1", "texts": {"zh-TW": "丟/捐 1 件物品", "en": "Discard/donate 1 item", "es": "Desecha/dona 1 artículo"}, "cat": "home"},
    {"id": "plan_day", "texts": {"zh-TW": "寫下今日 3 件最重要", "en": "Plan top 3 for today", "es": "Planifica tus 3 prioridades"}, "cat": "work"},
    {"id": "inbox5", "texts": {"zh-TW": "收件匣清 5 封", "en": "Inbox: clear 5 emails", "es": "Bandeja: limpia 5 correos"}, "cat": "work"},
    {"id": "unsubscribe1", "texts": {"zh-TW": "取消 1 個訂閱郵件", "en": "Unsubscribe from 1 email list", "es": "Cancela 1 boletín"}, "cat": "digital"},
    {"id": "review_goals", "texts": {"zh-TW": "回顧本週目標 1 分鐘", "en": "Review weekly goals (1 min)", "es": "Revisa metas semanales (1 min)"}, "cat": "work"},
    {"id": "read2", "texts": {"zh-TW": "閱讀 2 頁", "en": "Read 2 pages", "es": "Lee 2 páginas"}, "cat": "learning"},
    {"id": "learn_word", "texts": {"zh-TW": "學一個新單字", "en": "Learn 1 new word", "es": "Aprende 1 palabra nueva"}, "cat": "learning"},
    {"id": "posture", "texts": {"zh-TW": "調整坐姿 30 秒", "en": "Fix posture for 30s", "es": "Corrige tu postura 30s"}, "cat": "body"},
    {"id": "message_friend", "texts": {"zh-TW": "問候一位朋友", "en": "Message a friend hello", "es": "Saluda a un amigo"}, "cat": "social"},
    {"id": "compliment", "texts": {"zh-TW": "稱讚 1 個人", "en": "Compliment someone", "es": "Elogia a alguien"}, "cat": "kindness"},
    {"id": "journal3", "texts": {"zh-TW": "日記 3 行", "en": "Journal 3 lines", "es": "Escribe 3 líneas de diario"}, "cat": "mind"},
    {"id": "breathe_sigh", "texts": {"zh-TW": "連續嘆氣 2 次放鬆", "en": "Double-sigh relax", "es": "Doble suspiro relajante"}, "cat": "mind"},
    {"id": "water_refill", "texts": {"zh-TW": "裝滿水瓶", "en": "Refill your bottle", "es": "Rellena tu botella"}, "cat": "body"},
    {"id": "fruit", "texts": {"zh-TW": "吃一份水果", "en": "Eat a piece of fruit", "es": "Come una fruta"}, "cat": "body"},
    {"id": "tea_break", "texts": {"zh-TW": "泡一杯茶/咖啡", "en": "Brew tea/coffee", "es": "Prepara té/café"}, "cat": "body"},
    {"id": "app_clean", "texts": {"zh-TW": "刪 3 個不用的 App", "en": "Delete 3 unused apps", "es": "Elimina 3 apps"}, "cat": "digital"},
    {"id": "photos_clean", "texts": {"zh-TW": "清 10 張相片", "en": "Clean 10 photos", "es": "Limpia 10 fotos"}, "cat": "digital"},
    {"id": "notifications", "texts": {"zh-TW": "關閉 1 個多餘通知", "en": "Disable 1 noisy notification", "es": "Desactiva 1 notificación"}, "cat": "digital"},
    {"id": "breath_count", "texts": {"zh-TW": "深呼吸 10 次", "en": "Take 10 deep breaths", "es": "Da 10 respiraciones profundas"}, "cat": "mind"},
    {"id": "gratitude_msg", "texts": {"zh-TW": "傳訊感謝某人", "en": "Send a thank-you message", "es": "Envía un agradecimiento"}, "cat": "kindness"},
    {"id": "water_plants", "texts": {"zh-TW": "澆花/照顧植物", "en": "Water plants", "es": "Riega las plantas"}, "cat": "home"},
    {"id": "make_bed", "texts": {"zh-TW": "整理床鋪", "en": "Make your bed", "es": "Tiende la cama"}, "cat": "home"},
    {"id": "file_sync", "texts": {"zh-TW": "備份/同步檔案", "en": "Backup/sync files", "es": "Respalda/sincroniza archivos"}, "cat": "digital"},
    {"id": "pomodoro", "texts": {"zh-TW": "設定 1 次番茄鐘", "en": "Set 1 pomodoro timer", "es": "Inicia 1 pomodoro"}, "cat": "work"},
    {"id": "read_later_clean", "texts": {"zh-TW": "清除 3 篇稍後閱讀", "en": "Clear 3 read-later items", "es": "Limpia 3 artículos guardados"}, "cat": "digital"},
    {"id": "link_share", "texts": {"zh-TW": "分享 1 則有用連結", "en": "Share 1 helpful link", "es": "Comparte 1 enlace útil"}, "cat": "social"},
    {"id": "smile", "texts": {"zh-TW": "對自己微笑", "en": "Smile at yourself", "es": "Sonríe a ti mismo"}, "cat": "mind"},
    {"id": "posture_walk", "texts": {"zh-TW": "站立走動 2 分鐘", "en": "Stand and walk 2 minutes", "es": "Párate y camina 2 min"}, "cat": "body"},
    {"id": "hydrate_tea", "texts": {"zh-TW": "喝一杯茶/水", "en": "Hydrate: tea/water", "es": "Hidrátate: té/agua"}, "cat": "body"},
]


_TASKS_BY_ID: Dict[str, Dict] = {t["id"]: t for t in TASKS_CATALOG}


def get_task_text(task_id: str, locale: str) -> str:
    task = _TASKS_BY_ID.get(task_id)
    if not task:
        return task_id
    texts = task.get("texts", {})
    return texts.get(locale) or texts.get("en") or task_id


def generate_board(seed: int, locale: str) -> List[str]:
    rnd = random.Random(seed)
    pool = list(_TASKS_BY_ID.keys())
    rnd.shuffle(pool)
    # Pick first 9 unique tasks
    return pool[:9]


def get_translated_texts(task_ids: List[str], locale: str) -> List[str]:
    return [get_task_text(tid, locale) for tid in task_ids]