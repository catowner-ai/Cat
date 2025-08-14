from __future__ import annotations

import datetime as dt
from typing import List, Optional

from fastapi import Depends, FastAPI, Form, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, PlainTextResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from sqlmodel import select
from sqlalchemy import func
from pathlib import Path
import os
import time
import io
import csv
from urllib.parse import urlparse

from .db import init_db, get_session
from .models import Poll, Option, Vote
from .utils import generate_short_code, get_or_set_voter_id, detect_language, SimpleRateLimiter, get_client_ip, compute_etag
from .i18n import t


BASE_DIR = Path(__file__).parent
TEMPLATES_DIR = str(BASE_DIR / "templates")
STATIC_DIR = str(BASE_DIR / "static")

templates = Jinja2Templates(directory=TEMPLATES_DIR)
rate_limiter = SimpleRateLimiter()


def create_app() -> FastAPI:
	app = FastAPI(title="PulsePoll")

	app.add_middleware(GZipMiddleware, minimum_size=500)
	app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_headers=["*"], allow_methods=["*"])
	allowed_hosts = os.environ.get("ALLOWED_HOSTS")
	if allowed_hosts:
		app.add_middleware(TrustedHostMiddleware, allowed_hosts=[h.strip() for h in allowed_hosts.split(",") if h.strip()])

	@app.middleware("http")
	async def security_headers(request: Request, call_next):
		response: Response = await call_next(request)
		response.headers.setdefault("X-Content-Type-Options", "nosniff")
		response.headers.setdefault("X-Frame-Options", "DENY")
		response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
		response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://api.qrserver.com; connect-src 'self'; frame-ancestors 'none'"
		response.headers.setdefault("Content-Security-Policy", csp)
		if request.url.scheme == "https":
			response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		return response

	app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

	@app.on_event("startup")
	def _startup() -> None:
		init_db()

	@app.middleware("http")
	async def add_lang_to_state(request: Request, call_next):
		response: Response = await call_next(request)
		lang = detect_language(request)
		if not request.cookies.get("lang"):
			response.set_cookie("lang", lang, max_age=60 * 60 * 24 * 365, samesite="lax")
		return response

	@app.get("/health")
	async def health() -> dict:
		return {"status": "ok", "time": dt.datetime.utcnow().isoformat()}

	@app.get("/robots.txt")
	def robots() -> PlainTextResponse:
		return PlainTextResponse("User-agent: *\nAllow: /\n")

	@app.get("/sitemap.xml")
	def sitemap(request: Request, session=Depends(get_session)) -> PlainTextResponse:
		root = str(request.base_url).rstrip("/")
		polls = list(session.exec(select(Poll).order_by(Poll.created_at.desc()).limit(200)))
		urls = [f"<url><loc>{root}/</loc></url>", f"<url><loc>{root}/trending</loc></url>"] + [f"<url><loc>{root}/p/{p.code}</loc></url>" for p in polls]
		xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" \
			+ "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" \
			+ "".join(urls) + "</urlset>"
		return PlainTextResponse(xml, media_type="application/xml")

	@app.get("/lang/{lang}")
	def switch_lang(lang: str, request: Request):
		resp = RedirectResponse(url=request.headers.get("referer") or "/")
		if lang not in {"en", "zh-TW"}:
			lang = "en"
		resp.set_cookie("lang", lang, max_age=60 * 60 * 24 * 365, samesite="lax")
		return resp

	@app.get("/", response_class=HTMLResponse)
	def index(request: Request, session=Depends(get_session)):
		lang = detect_language(request)
		cutoff = dt.datetime.utcnow() - dt.timedelta(days=1)
		polls_recent = list(session.exec(select(Poll).order_by(Poll.created_at.desc()).limit(100)))
		# aggregate vote counts per poll in last 24h
		rows = session.exec(
			select(Vote.poll_id, func.count(Vote.id)).where(Vote.created_at >= cutoff).group_by(Vote.poll_id)
		).all()
		counts_per_poll = {poll_id: count for poll_id, count in rows}
		trending = sorted(
			polls_recent,
			key=lambda p: (counts_per_poll.get(p.id, 0), p.created_at),
			reverse=True,
		)[:10]
		return templates.TemplateResponse(
			"index.html",
			{"request": request, "t": lambda k: t(lang, k), "trending": trending, "lang": lang},
		)

	@app.get("/create", response_class=HTMLResponse)
	def create_page(request: Request):
		lang = detect_language(request)
		return templates.TemplateResponse(
			"create.html",
			{"request": request, "t": lambda k: t(lang, k), "lang": lang},
		)

	@app.post("/create")
	def create_poll(
		request: Request,
		question: str = Form(...),
		option1: str = Form(""),
		option2: str = Form(""),
		option3: str = Form(""),
		option4: str = Form(""),
		option5: str = Form(""),
		session=Depends(get_session),
	):
		lang = detect_language(request)
		options_text = [o.strip() for o in [option1, option2, option3, option4, option5] if o and o.strip()]
		if not question.strip() or len(options_text) < 2:
			raise HTTPException(status_code=400, detail="invalid_input")
		client_ip = get_client_ip(request)
		if not rate_limiter.allow(f"create:{client_ip}", limit=20, window_seconds=60 * 60):
			raise HTTPException(status_code=429, detail="rate_limited")
		code = generate_short_code()
		while session.exec(select(Poll).where(Poll.code == code)).first() is not None:
			code = generate_short_code()
		poll = Poll(code=code, question=question.strip(), locale=lang)
		session.add(poll)
		session.commit()
		session.refresh(poll)
		for text in options_text:
			opt = Option(poll_id=poll.id, text=text)
			session.add(opt)
		session.commit()
		return RedirectResponse(url=f"/p/{code}", status_code=303)

	@app.get("/p/{code}", response_class=HTMLResponse)
	def poll_page(code: str, request: Request, session=Depends(get_session)):
		lang = detect_language(request)
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			return templates.TemplateResponse(
				"404.html",
				{"request": request, "message": t(lang, "poll_not_found"), "t": lambda k: t(lang, k), "lang": lang},
				status_code=404,
			)
		options = list(session.exec(select(Option).where(Option.poll_id == poll.id)))
		voter_id = request.cookies.get("voter_id")
		current_vote = None
		if voter_id:
			current_vote = session.exec(
				select(Vote).where(Vote.poll_id == poll.id, Vote.voter_id == voter_id)
			).first()
		return templates.TemplateResponse(
			"poll.html",
			{
				"request": request,
				"t": lambda k: t(lang, k),
				"poll": poll,
				"options": options,
				"current_vote": current_vote,
				"lang": lang,
			},
		)

	@app.get("/e/{code}", response_class=HTMLResponse)
	def embed_page(code: str, request: Request, session=Depends(get_session)):
		lang = detect_language(request)
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			return PlainTextResponse("Not found", status_code=404)
		options = list(session.exec(select(Option).where(Option.poll_id == poll.id)))
		resp = templates.TemplateResponse(
			"embed.html",
			{"request": request, "poll": poll, "options": options, "t": lambda k: t(lang, k), "lang": lang},
		)
		# Relax frame embedding for embeddable endpoint
		resp.headers["X-Frame-Options"] = "ALLOWALL"
		resp.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors *; script-src 'self' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline'"
		return resp

	@app.get("/oembed")
	def oembed(url: str, request: Request, maxwidth: int = 600, maxheight: int = 300):
		"""Simple oEmbed provider for poll pages."""
		try:
			path = urlparse(url).path
		except Exception:
			raise HTTPException(status_code=400, detail="invalid_url")
		parts = [p for p in path.split("/") if p]
		code = None
		for i, pseg in enumerate(parts):
			if pseg == "p" and i + 1 < len(parts):
				code = parts[i + 1]
				break
		if not code:
			raise HTTPException(status_code=400, detail="unsupported_url")
		root = str(request.base_url).rstrip("/")
		embed_html = f"<iframe src=\"{root}/e/{code}\" width=\"{maxwidth}\" height=\"{maxheight}\" frameborder=\"0\" loading=\"lazy\"></iframe>"
		return {
			"type": "rich",
			"version": "1.0",
			"provider_name": "PulsePoll",
			"provider_url": root,
			"title": f"PulsePoll: {code}",
			"html": embed_html,
			"width": maxwidth,
			"height": maxheight,
		}

	@app.post("/p/{code}/vote")
	def vote_on_poll(code: str, request: Request, response: Response, option_id: int = Form(...), session=Depends(get_session)):
		lang = detect_language(request)
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			raise HTTPException(status_code=404, detail="not_found")
		# rate-limit voting per IP per poll
		ip = get_client_ip(request)
		if not rate_limiter.allow(f"vote:{poll.id}:{ip}", limit=60, window_seconds=60):
			raise HTTPException(status_code=429, detail="rate_limited")
		option = session.exec(select(Option).where(Option.id == option_id, Option.poll_id == poll.id)).first()
		if not option:
			raise HTTPException(status_code=400, detail="invalid_option")
		voter_id = get_or_set_voter_id(request, response)
		existing_vote = session.exec(
			select(Vote).where(Vote.poll_id == poll.id, Vote.voter_id == voter_id)
		).first()
		if existing_vote:
			existing_vote.option_id = option.id
		else:
			vote = Vote(poll_id=poll.id, option_id=option.id, voter_id=voter_id)
			session.add(vote)
		session.commit()
		return RedirectResponse(url=f"/p/{code}", status_code=303)

	@app.get("/p/{code}/results")
	def poll_results(code: str, request: Request, session=Depends(get_session)):
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			raise HTTPException(status_code=404, detail="not_found")
		options = list(session.exec(select(Option).where(Option.poll_id == poll.id)))
		# aggregate counts via GROUP BY
		rows = session.exec(
			select(Vote.option_id, func.count(Vote.id)).where(Vote.poll_id == poll.id).group_by(Vote.option_id)
		).all()
		counts = {opt.id: 0 for opt in options}
		for option_id, count in rows:
			counts[option_id] = count
		total = sum(counts.values())
		payload = {"poll": poll.code, "total": total, "options": [{"id": o.id, "text": o.text, "count": counts[o.id]} for o in options]}
		etag = compute_etag(payload)
		if request.headers.get("if-none-match") == etag:
			return Response(status_code=304)
		return JSONResponse(payload, headers={"ETag": etag})

	@app.get("/p/{code}/export.csv")
	def export_csv(code: str, session=Depends(get_session)):
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			raise HTTPException(status_code=404, detail="not_found")
		options = list(session.exec(select(Option).where(Option.poll_id == poll.id)))
		rows = session.exec(
			select(Vote.option_id, func.count(Vote.id)).where(Vote.poll_id == poll.id).group_by(Vote.option_id)
		).all()
		counts = {opt.id: 0 for opt in options}
		for option_id, count in rows:
			counts[option_id] = count
		buf = io.StringIO()
		writer = csv.writer(buf)
		writer.writerow(["option_id", "option_text", "count"])
		for o in options:
			writer.writerow([o.id, o.text, counts[o.id]])
		data = buf.getvalue()
		return Response(content=data, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={poll.code}_results.csv"})

	@app.get("/p/{code}/events")
	def sse_events(code: str, session=Depends(get_session)):
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			raise HTTPException(status_code=404, detail="not_found")
		options = list(session.exec(select(Option).where(Option.poll_id == poll.id)))
		option_ids = [o.id for o in options]

		def event_stream():
			for _ in range(120):
				rows = session.exec(
					select(Vote.option_id, func.count(Vote.id)).where(Vote.poll_id == poll.id).group_by(Vote.option_id)
				).all()
				counts_map = {oid: cnt for oid, cnt in rows}
				total = sum(counts_map.values())
				payload = {"total": total, "options": [{"id": o.id, "text": o.text, "count": int(counts_map.get(o.id, 0))} for o in options]}
				yield f"data: {payload}\n\n"
				time.sleep(2)

		return StreamingResponse(event_stream(), media_type="text/event-stream")

	@app.get("/trending", response_class=HTMLResponse)
	def trending(request: Request, session=Depends(get_session)):
		lang = detect_language(request)
		cutoff = dt.datetime.utcnow() - dt.timedelta(days=1)
		polls_recent = list(session.exec(select(Poll).order_by(Poll.created_at.desc()).limit(100)))
		rows = session.exec(
			select(Vote.poll_id, func.count(Vote.id)).where(Vote.created_at >= cutoff).group_by(Vote.poll_id)
		).all()
		counts_per_poll = {poll_id: count for poll_id, count in rows}
		polls = sorted(polls_recent, key=lambda p: (counts_per_poll.get(p.id, 0), p.created_at), reverse=True)
		return templates.TemplateResponse(
			"trending.html",
			{"request": request, "t": lambda k: t(lang, k), "polls": polls, "lang": lang},
		)

	@app.get("/random")
	def random_poll(session=Depends(get_session)):
		polls = list(session.exec(select(Poll).order_by(Poll.created_at.desc()).limit(100)))
		if not polls:
			raise HTTPException(status_code=404, detail="no_polls")
		import random
		poll = random.choice(polls)
		return RedirectResponse(url=f"/p/{poll.code}")

	@app.post("/api/polls")
	def api_create_poll(payload: dict, request: Request, session=Depends(get_session)):
		question = str(payload.get("question", "")).strip()
		options: List[str] = [str(o).strip() for o in payload.get("options", []) if str(o).strip()]
		if not question or len(options) < 2:
			raise HTTPException(status_code=400, detail="invalid_input")
		client_ip = get_client_ip(request)
		if not rate_limiter.allow(f"create:{client_ip}", limit=100, window_seconds=60 * 60):
			raise HTTPException(status_code=429, detail="rate_limited")
		code = generate_short_code()
		while session.exec(select(Poll).where(Poll.code == code)).first() is not None:
			code = generate_short_code()
		poll = Poll(code=code, question=question, locale=detect_language(request))
		session.add(poll)
		session.commit()
		session.refresh(poll)
		for text in options:
			session.add(Option(poll_id=poll.id, text=text))
		session.commit()
		return {"code": poll.code}

	@app.get("/api/polls/{code}")
	def api_get_poll(code: str, session=Depends(get_session)):
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			raise HTTPException(status_code=404, detail="not_found")
		options = list(session.exec(select(Option).where(Option.poll_id == poll.id)))
		return {"code": poll.code, "question": poll.question, "options": [{"id": o.id, "text": o.text} for o in options]}

	@app.post("/api/polls/{code}/vote")
	def api_vote(code: str, payload: dict, request: Request, response: Response, session=Depends(get_session)):
		option_id = int(payload.get("option_id"))
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			raise HTTPException(status_code=404, detail="not_found")
		# rate-limit voting per IP per poll
		ip = get_client_ip(request)
		if not rate_limiter.allow(f"vote:{poll.id}:{ip}", limit=120, window_seconds=60):
			raise HTTPException(status_code=429, detail="rate_limited")
		option = session.exec(select(Option).where(Option.id == option_id, Option.poll_id == poll.id)).first()
		if not option:
			raise HTTPException(status_code=400, detail="invalid_option")
		voter_id = get_or_set_voter_id(request, response)
		existing_vote = session.exec(select(Vote).where(Vote.poll_id == poll.id, Vote.voter_id == voter_id)).first()
		if existing_vote:
			existing_vote.option_id = option.id
		else:
			session.add(Vote(poll_id=poll.id, option_id=option.id, voter_id=voter_id))
		session.commit()
		return {"status": "ok"}

	@app.get("/offline", response_class=HTMLResponse)
	def offline(request: Request):
		# minimal offline fallback page
		return templates.TemplateResponse("offline.html", {"request": request})

	return app


app = create_app()