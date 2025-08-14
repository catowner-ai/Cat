# Deployment

## Local
- See README quickstart: use `uvicorn app.main:app --reload`

## Docker
Create image:
```bash
docker build -t pulsepoll:latest .
```
Run:
```bash
docker run -p 8000:8000 -v $(pwd):/app pulsepoll:latest
```

## Production Tips
- Use `gunicorn` with `uvicorn.workers.UvicornWorker`
- Put behind a reverse proxy (nginx, Caddy)
- Enforce HTTPS, secure cookies
- Use Postgres + SQLAlchemy/SQLModel in place of SQLite
- Externalize static assets to a CDN if needed