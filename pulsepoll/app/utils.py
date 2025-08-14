from __future__ import annotations

import random
import string
import time
import uuid
import hashlib
import json
from typing import Dict, Optional, Tuple

from fastapi import Request, Response


_BASE62_ALPHABET = string.digits + string.ascii_lowercase + string.ascii_uppercase


def generate_short_code(length: int = 7) -> str:
	return "".join(random.choice(_BASE62_ALPHABET) for _ in range(length))


def get_or_set_voter_id(request: Request, response: Response) -> str:
	voter_id = request.cookies.get("voter_id")
	if not voter_id:
		voter_id = uuid.uuid4().hex
		# 1 year
		response.set_cookie("voter_id", voter_id, max_age=60 * 60 * 24 * 365, httponly=True, samesite="lax")
	return voter_id


def detect_language(request: Request) -> str:
	cookie_lang = request.cookies.get("lang")
	if cookie_lang:
		return cookie_lang
	accept = request.headers.get("Accept-Language", "")
	for token in accept.split(","):
		lang = token.split(";")[0].strip()
		if lang.startswith("zh-TW") or lang.startswith("zh-Hant"):
			return "zh-TW"
		if lang.startswith("en"):
			return "en"
	return "en"


class SimpleRateLimiter:
	"""Very basic in-memory rate limiter keyed by (key, window_seconds)."""

	def __init__(self) -> None:
		self._store: Dict[Tuple[str, int], Tuple[int, float]] = {}

	def allow(self, key: str, limit: int, window_seconds: int) -> bool:
		now = time.time()
		bucket = int(now // window_seconds)
		k = (key, bucket)
		count, _ = self._store.get(k, (0, now))
		if count >= limit:
			return False
		self._store[k] = (count + 1, now)
		return True


def get_client_ip(request: Request) -> str:
	xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
	if xff:
		# take first IP
		return xff.split(",")[0].strip()
	return request.client.host if request.client else "anon"


def compute_etag(obj: object) -> str:
	payload = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
	return 'W/"' + hashlib.sha1(payload).hexdigest() + '"'