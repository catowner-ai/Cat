# Architecture

## Overview
- FastAPI application (`app.main:create_app`) exposes HTML pages and JSON APIs
- Persistence via SQLModel + SQLite
- Templates rendered with Jinja2
- Client updates results via periodic polling (setInterval)

## Data Model
- `Poll(id, code, question, created_at, locale)`
- `Option(id, poll_id, text)`
- `Vote(id, poll_id, option_id, voter_id, created_at)`

Vote uniqueness: `(poll_id, voter_id)` logical uniqueness enforced in app logic (update if exists).

## Request Flow
1. Create poll: POST `/create` (form) or POST `/api/polls` (JSON)
2. Visit `/p/{code}` to render poll with options
3. Submit vote -> Redirect to `/p/{code}`; client refreshes results
4. Results polled from `/p/{code}/results`

## Internationalization
- Language detected from `Accept-Language` or cookie `lang`
- Dictionary-based i18n in `app/i18n.py`

## Rate Limiting
- Basic in-memory limiter in `app/utils.py` keyed by IP and window

## Scalability Notes
- Migrate to Postgres for multi-instance deployments
- Replace polling with WebSocket/SSE for true realtime updates
- Add Redis-based rate limiting and vote deduplication
- Introduce unique DB constraint on `(poll_id, voter_id)` with upsert