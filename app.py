from __future__ import annotations

import random
from datetime import date
from typing import List

import streamlit as st

from tinywins import db, tasks, i18n, utils, share_card, ics_utils, gamify


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
    gamify.ensure_profile()


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

    # Daily login & commissions
    with st.sidebar.expander("Daily", expanded=False):
        if st.button("Claim daily login (20 gems, 30 XP)"):
            if gamify.claim_daily_login(day_str):
                st.success("Daily reward claimed")
            else:
                st.info("Already claimed today")
        st.caption("Daily Commissions")
        for item in gamify.generate_commissions(day_str):
            if st.button(f"Claim: {item['title']}", key=f"claim-{item['key']}"):
                if gamify.claim_commission(day_str, item['key']):
                    st.success("Commission reward claimed")
                else:
                    st.info("Already claimed")

    # Title
    st.title(i18n.t(locale, "app_title"))
    st.caption(i18n.t(locale, "tagline"))

    # Profile choose (job/element)
    with st.expander("Profile", expanded=False):
        prof = db.get_profile()
        job = st.selectbox("Job Class", options=["None", "Warrior", "Archer", "Mage", "Thief"], index=0)
        elem = st.selectbox("Element", options=["None", "Pyro", "Hydro", "Electro", "Cryo"], index=0)
        if st.button("Save Profile"):
            gamify.set_profile(None if job == "None" else job, None if elem == "None" else elem)
            st.success("Saved")

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
                if new_val:
                    gamify.award_task_once(day_str, task_id, base_xp=12, gem_reward=3)
                    recent = db.get_recent_completed(day_str, limit=2)
                    gamify.apply_combo_bonus(day_str, recent)
            if comp_map.get(task_id):
                completed_count += 1

    # Stats + Profile
    col_a, col_b, col_c = st.columns(3)
    streak = db.get_current_streak()
    profile = db.get_profile()
    level, xp_in_level, cap = gamify.level_from_total_xp(profile["xp"] if profile else 0)
    col_a.metric(i18n.t(locale, "streak_label"), f"{streak}")
    col_b.metric("LV / XP", f"Lv.{level}  {xp_in_level}/{cap}")
    col_c.metric("Gems", f"{profile['gems'] if profile else 0}")
    with st.expander("Talents", expanded=False):
        talents = gamify.get_talents()
        cols_t = st.columns(2)
        with cols_t[0]:
            lvl = int(talents.get("combo_mastery", 0))
            if st.button(f"Combo Mastery Lv.{lvl} (+{2*lvl}% XP)"):
                if gamify.upgrade_talent("combo_mastery"):
                    st.success("Upgraded Combo Mastery")
                else:
                    st.info("Cannot upgrade")
        with cols_t[1]:
            lvl = int(talents.get("elemental_attunement", 0))
            if st.button(f"Elemental Attunement Lv.{lvl}"):
                if gamify.upgrade_talent("elemental_attunement"):
                    st.success("Upgraded Elemental Attunement")
                else:
                    st.info("Cannot upgrade")

    stats = db.get_stats_last_n_days(14)
    days = [d for d, _ in stats]
    values = [v for _, v in stats]
    st.area_chart(values, height=140)
    st.caption(i18n.t(locale, "last_14_days"))

    # Weekly Boss
    with st.expander("Weekly Boss", expanded=False):
        if st.button("Claim weekly reward"):
            if gamify.claim_weekly_boss_reward(day_str):
                st.success("Weekly reward claimed")
            else:
                st.info("Already claimed this week")

    # Wish / Gacha
    with st.expander("Wishing (Gacha)", expanded=False):
        state = db.get_gacha_state()
        st.caption(f"Pity — Rare: {state['pity_rare']}/10, Epic: {state['pity_epic']}/50")
        colw1, colw2 = st.columns([1, 2])
        count = colw1.selectbox("Count", options=[1, 10], index=0)
        cost = 8 * count
        if colw2.button(f"Wish x{count} (cost {cost} gems)"):
            if gamify.spend_gems(cost):
                results = gamify.wish(count=count)
                st.success(f"Obtained {len(results)} artifact(s)")
            else:
                st.error("Not enough gems")
        st.caption("Artifacts (click to equip/unequip)")
        arts = db.list_artifacts()
        cols = st.columns(3)
        for i, a in enumerate(arts[:30]):
            with cols[i % 3]:
                equipped = a['equipped'] == 1
                if st.button(f"{'[E] ' if equipped else ''}[{a['rarity']}] {a['name']}", key=f"art-{a['id']}"):
                    db.set_artifact_equipped(a['id'], not equipped)
                    st.experimental_rerun()

    # Downloads
    tasks_and_status = [(texts[i], bool(comp_map.get(task_ids[i], False))) for i in range(9)]
    themes = gamify.list_themes_unlocked()
    theme = st.selectbox("Theme", options=themes, index=0)
    share_png = share_card.render_share_card(
        board_date=day_str,
        tasks_and_status=tasks_and_status,
        locale_label=i18n.LANG_OPTIONS.get(locale, locale),
        streak_days=streak,
        seed=int(board["seed"]),
        rerolls=int(board["rerolls"]),
        title_text=i18n.t(locale, "app_title"),
        theme=theme,
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