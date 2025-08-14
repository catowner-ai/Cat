from __future__ import annotations

from typing import List
from io import BytesIO
from datetime import datetime, date, time, timedelta


def _ics_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def build_ics(board_date: str, tasks_texts: List[str]) -> BytesIO:
    d = datetime.strptime(board_date, "%Y-%m-%d").date()
    start_hour = 8
    dur_minutes = 25

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TinyWins//tinywins.app//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    for i, summary in enumerate(tasks_texts):
        st_dt = datetime.combine(d, time(hour=start_hour + i))
        en_dt = st_dt + timedelta(minutes=dur_minutes)
        dtstart = st_dt.strftime("%Y%m%dT%H%M%S")
        dtend = en_dt.strftime("%Y%m%dT%H%M%S")
        uid = f"tinywins-{d.isoformat()}-{i}@app"
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{now}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"SUMMARY:{_ics_escape(summary)}",
            "END:VEVENT",
        ])

    lines.append("END:VCALENDAR")
    content = "\r\n".join(lines) + "\r\n"
    bio = BytesIO(content.encode("utf-8"))
    bio.seek(0)
    return bio