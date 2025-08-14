# Contributing

Thank you for considering contributing to PulsePoll!

## Development Setup
1. Create virtualenv and install deps: `pip install -r requirements.txt`
2. Run server: `uvicorn app.main:app --reload`
3. Run tests: `pytest -q`

## Code Style
- Python 3.11+
- Prefer explicit, descriptive names
- Add type hints and docstrings where helpful
- Keep functions short; use early returns

## Pull Requests
- Include tests for new features
- Update docs under `docs/` and `README.md`
- Keep commits focused and well-described