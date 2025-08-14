from __future__ import annotations

from pydantic import BaseModel, field_validator
from typing import List


class CreatePollRequest(BaseModel):
	question: str
	options: List[str]

	@field_validator("question")
	@classmethod
	def validate_question(cls, v: str) -> str:
		v = (v or "").strip()
		if not v:
			raise ValueError("question_required")
		if len(v) > 240:
			raise ValueError("question_too_long")
		return v

	@field_validator("options")
	@classmethod
	def validate_options(cls, v: List[str]) -> List[str]:
		clean = [str(o).strip() for o in v if str(o).strip()]
		# deduplicate while preserving order
		seen = set()
		unique = []
		for o in clean:
			if o not in seen:
				seen.add(o)
				unique.append(o)
		if len(unique) < 2:
			raise ValueError("at_least_two_options")
		if len(unique) > 20:
			unique = unique[:20]
		# enforce max length per option
		return [o[:120] for o in unique]


class VoteRequest(BaseModel):
	option_id: int