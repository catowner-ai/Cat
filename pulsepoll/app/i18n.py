from __future__ import annotations

from typing import Dict


_STRINGS: Dict[str, Dict[str, str]] = {
	"en": {
		"app_name": "PulsePoll",
		"create_poll": "Create a Poll",
		"question": "Question",
		"options": "Options",
		"add_option": "Add option",
		"create": "Create",
		"vote": "Vote",
		"results": "Results",
		"share_link": "Share this link",
		"trending": "Trending",
		"random": "Random",
		"your_vote_has_been_recorded": "Your vote has been recorded!",
		"already_voted": "You already voted. Your vote has been updated.",
		"total_votes": "Total votes",
		"create_subtitle": "Ask anything. Get the world's pulse in seconds.",
		"index_cta": "Start a poll now",
		"option_placeholder": "Option",
		"enter_question": "Enter your question",
		"poll_not_found": "Poll not found",
	},
	"zh-TW": {
		"app_name": "PulsePoll",
		"create_poll": "建立投票",
		"question": "問題",
		"options": "選項",
		"add_option": "新增選項",
		"create": "建立",
		"vote": "投票",
		"results": "結果",
		"share_link": "分享此連結",
		"trending": "熱門趨勢",
		"random": "隨機",
		"your_vote_has_been_recorded": "已記錄你的投票！",
		"already_voted": "你已投過票，已更新你的選擇。",
		"total_votes": "總票數",
		"create_subtitle": "問任何問題，數秒看見全世界的心聲。",
		"index_cta": "立即建立投票",
		"option_placeholder": "選項",
		"enter_question": "請輸入你的問題",
		"poll_not_found": "找不到投票",
	},
}


def t(lang: str, key: str) -> str:
	lang_map = _STRINGS.get(lang) or _STRINGS["en"]
	return lang_map.get(key, key)