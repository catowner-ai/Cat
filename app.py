from __future__ import annotations

import random
from datetime import date
from typing import List

import streamlit as st

from tinywins import db, tasks, i18n, utils, share_card, ics_utils


st.set_page_config(page_title="TinyWins", page_icon="✨", layout="centered")


def _ensure_board_for_day(day_str: str, locale: str):
    board = db.get_board(day_str)
    if board is None:
        seed = random.randint(100000, 999999)
        task_ids = tasks.generate_board(seed=seed, locale=locale)
        board = db.create_board(day=day_str, tasks=task_ids, locale=locale, seed=seed)
        db.ensure_completions(day=day_str, task_ids=task_ids)
    else:
        # Ensure completion rows match stored tasks
        db.ensure_completions(day=day_str, task_ids=board["tasks"])  # type: ignore
    return board


@st.cache_resource(show_spinner=False)
def _init_once():
    db.init_db()
    utils.ensure_data_dir()


def main() -> None:
    _init_once()

    # Sidebar: language & date
    st.sidebar.subheader(i18n.t(st.session_state.get("locale", "zh-TW"), "choose_language"))
    locale = st.sidebar.selectbox(
        "",
        options=list(i18n.LANG_OPTIONS.keys()),
        format_func=lambda x: i18n.LANG_OPTIONS[x],
        index=list(i18n.LANG_OPTIONS.keys()).index(st.session_state.get("locale", "zh-TW")),
        key="locale",
    )

    st.sidebar.subheader(i18n.t(locale, "select_date"))
    selected_date = st.sidebar.date_input(
        label="",
        value=date.today(),
        max_value=date.max,
        min_value=date(2020, 1, 1),
        key="selected_date",
    )
    day_str = selected_date.isoformat()

    board = _ensure_board_for_day(day_str, locale)

    # Reroll button
    if st.sidebar.button(i18n.t(locale, "reroll"), use_container_width=True):
        seed = random.randint(100000, 999999)
        new_task_ids = tasks.generate_board(seed=seed, locale=locale)
        board = db.update_board_reroll(day=day_str, tasks=new_task_ids, seed=seed)
        db.reset_day_completions(day=day_str, task_ids=new_task_ids)
        st.toast(i18n.t(locale, "board_rerolled"))

    st.sidebar.caption(f"{i18n.t(locale, 'seed_label')}: {board['seed']}  •  {i18n.t(locale, 'rerolls_label')}: {board['rerolls']}")

    # Title
    st.title(i18n.t(locale, "app_title"))
    st.caption(i18n.t(locale, "tagline"))

    # Load tasks and completions
    task_ids: List[str] = board["tasks"]  # type: ignore
    texts = tasks.get_translated_texts(task_ids, locale)
    comp_map = db.get_completions(day_str)

    # Grid 3x3
    completed_count = 0
    for r in range(3):
        cols = st.columns(3, gap="small")
        for c in range(3):
            idx = r * 3 + c
            task_id = task_ids[idx]
            label = texts[idx]
            current = bool(comp_map.get(task_id, False))
            new_val = cols[c].checkbox(label=label, value=current, key=f"cb-{day_str}-{task_id}")
            if new_val != current:
                db.set_completion(day_str, task_id, new_val)
                comp_map[task_id] = new_val
            if comp_map.get(task_id):
                completed_count += 1

    # Stats
    col_a, col_b = st.columns(2)
    streak = db.get_current_streak()
    col_a.metric(i18n.t(locale, "streak_label"), f"{streak}")
    col_b.metric(i18n.t(locale, "tasks_completed"), f"{completed_count}/9")

    stats = db.get_stats_last_n_days(14)
    days = [d for d, _ in stats]
    values = [v for _, v in stats]
    st.area_chart(values, height=140)
    st.caption(i18n.t(locale, "last_14_days"))

    # Downloads
    tasks_and_status = [(texts[i], bool(comp_map.get(task_ids[i], False))) for i in range(9)]
    share_png = share_card.render_share_card(
        board_date=day_str,
        tasks_and_status=tasks_and_status,
        locale_label=i18n.LANG_OPTIONS.get(locale, locale),
        streak_days=streak,
        seed=int(board["seed"]),
        rerolls=int(board["rerolls"]),
        title_text=i18n.t(locale, "app_title"),
    )
    st.download_button(
        label=i18n.t(locale, "download_share_card"),
        data=share_png,
        file_name=f"tinywins-{day_str}.png",
        mime="image/png",
        use_container_width=True,
    )

    ics_bytes = ics_utils.build_ics(board_date=day_str, tasks_texts=texts)
    st.download_button(
        label=i18n.t(locale, "download_calendar"),
        data=ics_bytes,
        file_name=f"tinywins-{day_str}.ics",
        mime="text/calendar",
        use_container_width=True,
    )

    st.caption(i18n.t(locale, "made_with_love"))


if __name__ == "__main__":
    main()