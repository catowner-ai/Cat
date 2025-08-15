from __future__ import annotations

from typing import List, Tuple
from datetime import datetime
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import textwrap


def _load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def _wrap(text: str, font: ImageFont.ImageFont, max_width: int, draw: ImageDraw.ImageDraw) -> List[str]:
    # Try to break on punctuation and spaces for multilingual
    seps = [' ', '、', '，', '。', '・', '/']
    lines: List[str] = []
    current = ''
    for ch in text:
        trial = (current + ch)
        w, _ = draw.textsize(trial, font=font)
        if w <= max_width:
            current = trial
        else:
            if current:
                lines.append(current.rstrip())
            current = ch
    if current:
        lines.append(current.rstrip())
    return lines


def render_share_card(
    board_date: str,
    tasks_and_status: List[Tuple[str, bool]],
    locale_label: str,
    streak_days: int,
    seed: int,
    rerolls: int,
    title_text: str,
    theme: str | None = None,
) -> BytesIO:
    W, H = 1080, 1350
    margin = 40
    header_h = 200
    grid_w = W - margin * 2
    grid_h = H - header_h - margin * 2
    cell_w = grid_w // 3
    cell_h = grid_h // 3

    # Theme palettes
    palettes = {
        "Default": {
            "bg": (14, 17, 23),
            "panel": (27, 31, 42),
            "primary": (123, 211, 137),
            "text": (230, 230, 230),
            "muted": (160, 170, 180),
        },
        "Pyro": {
            "bg": (20, 14, 14),
            "panel": (46, 24, 20),
            "primary": (234, 86, 54),
            "text": (250, 232, 218),
            "muted": (210, 150, 130),
        },
        "Cygnus": {
            "bg": (10, 12, 30),
            "panel": (22, 25, 55),
            "primary": (120, 140, 255),
            "text": (230, 236, 255),
            "muted": (170, 180, 220),
        },
    }
    pal = palettes.get(theme or "Default", palettes["Default"])

    bg = pal["bg"]
    panel = pal["panel"]
    primary = pal["primary"]
    text_color = pal["text"]
    muted = pal["muted"]

    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)

    title_font = _load_font(72)
    sub_font = _load_font(36)
    cell_font = _load_font(34)

    # Header
    draw.rounded_rectangle([(margin, margin), (W - margin, margin + header_h)], radius=24, fill=panel)
    draw.text((margin + 32, margin + 24), title_text, fill=text_color, font=title_font)

    meta = f"{board_date}  •  {locale_label}  •  {streak_days}🔥  •  seed {seed}  •  rerolls {rerolls}"
    draw.text((margin + 32, margin + 120), meta, fill=muted, font=sub_font)

    # Grid background
    top = margin + header_h + 20
    draw.rounded_rectangle([(margin, top), (W - margin, top + grid_h)], radius=28, fill=panel)

    # Cells
    for idx, (text, done) in enumerate(tasks_and_status):
        r = idx // 3
        c = idx % 3
        x0 = margin + c * cell_w
        y0 = top + r * cell_h
        x1 = x0 + cell_w
        y1 = y0 + cell_h
        pad = 18

        # Cell separator
        draw.rectangle([(x0, y0), (x1, y1)], outline=(60, 66, 80))

        # Checkbox
        cx, cy = x0 + pad + 24, y0 + pad + 24
        box_r = 20
        if done:
            draw.ellipse([(cx - box_r, cy - box_r), (cx + box_r, cy + box_r)], fill=primary)
            draw.ellipse([(cx - box_r + 6, cy - box_r + 6), (cx + box_r - 6, cy + box_r - 6)], fill=(30, 36, 46))
            draw.ellipse([(cx - box_r + 10, cy - box_r + 10), (cx + box_r - 10, cy + box_r - 10)], fill=primary)
        else:
            draw.ellipse([(cx - box_r, cy - box_r), (cx + box_r, cy + box_r)], outline=muted, width=3)

        # Text
        max_text_w = cell_w - pad * 2 - 60
        lines = _wrap(text, cell_font, max_text_w, draw)
        tx = x0 + pad + 60
        ty = y0 + pad + 4
        line_h = 40
        for li, line in enumerate(lines[:4]):
            draw.text((tx, ty + li * line_h), line, fill=text_color if done else text_color, font=cell_font)

    bio = BytesIO()
    img.save(bio, format="PNG", optimize=True)
    bio.seek(0)
    return bio