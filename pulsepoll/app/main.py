from __future__ import annotations

import datetime as dt
from typing import List, Optional

from fastapi import Depends, FastAPI, Form, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlmodel import select
from pathlib import Path

from .db import init_db, get_session
from .models import Poll, Option, Vote
from .utils import generate_short_code, get_or_set_voter_id, detect_language, SimpleRateLimiter
from .i18n import t


BASE_DIR = Path(__file__).parent
TEMPLATES_DIR = str(BASE_DIR / "templates")
STATIC_DIR = str(BASE_DIR / "static")

templates = Jinja2Templates(directory=TEMPLATES_DIR)
rate_limiter = SimpleRateLimiter()


def create_app() -> FastAPI:
	app = FastAPI(title="PulsePoll")

	app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

	@app.on_event("startup")
	def _startup() -> None:
		init_db()

	@app.middleware("http")
	async def add_lang_to_state(request: Request, call_next):
		response: Response = await call_next(request)
		lang = detect_language(request)
		# set cookie for persistence if not present
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
		# trending by votes in last 24h
		vote_counts = {}
		for p in polls_recent:
			count = session.exec(select(Vote).where(Vote.poll_id == p.id, Vote.created_at >= cutoff)).all()
			vote_counts[p.code] = len(count)
		trending = sorted(polls_recent, key=lambda p: (vote_counts.get(p.code, 0), p.created_at), reverse=True)[:10]
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
		client_ip = request.client.host if request.client else "anon"
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

	@app.post("/p/{code}/vote")
	def vote_on_poll(code: str, request: Request, response: Response, option_id: int = Form(...), session=Depends(get_session)):
		lang = detect_language(request)
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			raise HTTPException(status_code=404, detail="not_found")
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
	def poll_results(code: str, session=Depends(get_session)):
		poll = session.exec(select(Poll).where(Poll.code == code)).first()
		if not poll:
			raise HTTPException(status_code=404, detail="not_found")
		options = list(session.exec(select(Option).where(Option.poll_id == poll.id)))
		counts = {opt.id: 0 for opt in options}
		for opt in options:
			count = session.exec(select(Vote).where(Vote.poll_id == poll.id, Vote.option_id == opt.id)).all()
			counts[opt.id] = len(count)
		total = sum(counts.values())
		return {"poll": poll.code, "total": total, "options": [{"id": o.id, "text": o.text, "count": counts[o.id]} for o in options]}

	@app.get("/trending", response_class=HTMLResponse)
	def trending(request: Request, session=Depends(get_session)):
		lang = detect_language(request)
		cutoff = dt.datetime.utcnow() - dt.timedelta(days=1)
		polls_recent = list(session.exec(select(Poll).order_by(Poll.created_at.desc()).limit(100)))
		vote_counts = {}
		for p in polls_recent:
			count = session.exec(select(Vote).where(Vote.poll_id == p.id, Vote.created_at >= cutoff)).all()
			vote_counts[p.code] = len(count)
		polls = sorted(polls_recent, key=lambda p: (vote_counts.get(p.code, 0), p.created_at), reverse=True)
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
		client_ip = request.client.host if request.client else "anon"
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

	return app


app = create_app()