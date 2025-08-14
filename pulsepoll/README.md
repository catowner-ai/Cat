# PulsePoll

世界級的一鍵投票應用：建立問題、即時投票、分享連結，數秒看見全球脈動。

## 功能亮點
- 快速建立投票（2~5+ 選項）
- 免註冊投票（以 cookie 識別投票者）
- 即時結果更新（簡易輪詢）
- 熱門趨勢、隨機探索
- 中英雙語（自動偵測 `Accept-Language`，支援 `en` 與 `zh-TW`）
- 完整 JSON API

## 快速開始

### 1) 安裝依賴
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### 2) 啟動開發伺服器
```bash
uvicorn app.main:app --reload --port 8000
```
打開瀏覽器前往 `http://localhost:8000`。

### 3) 測試
```bash
pytest -q
```

## 專案結構
```
pulsepoll/
├─ app/
│  ├─ __init__.py
│  ├─ main.py
│  ├─ db.py
│  ├─ models.py
│  ├─ utils.py
│  ├─ i18n.py
│  ├─ templates/
│  │  ├─ base.html
│  │  ├─ index.html
│  │  ├─ create.html
│  │  ├─ poll.html
│  │  └─ trending.html
│  └─ static/
│     └─ app.js
├─ tests/
│  └─ test_api.py
├─ requirements.txt
└─ README.md
```

## API 簡述
- `POST /api/polls` 建立投票
- `GET /api/polls/{code}` 查詢投票
- `POST /api/polls/{code}/vote` 投票
- `GET /p/{code}/results` 取得投票結果

完整 API 與架構請見 `docs/`：
- `docs/api.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/contributing.md`

## 技術細節
- 後端：FastAPI + SQLModel + SQLite
- 模板：Jinja2 + Tailwind CDN
- 測試：pytest + httpx TestClient

## 授權
MIT