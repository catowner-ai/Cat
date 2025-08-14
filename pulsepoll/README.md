# PulsePoll

世界級的一鍵投票應用：建立問題、即時投票、分享連結，數秒看見全球脈動。

## 功能亮點
- 快速建立投票（2~5+ 選項）
- 免註冊投票（以 cookie 識別投票者）
- 即時結果更新：SSE（自動 fallback 輪詢）
- 熱門趨勢、隨機探索
- 中英雙語（自動偵測 `Accept-Language`，支援 `en` 與 `zh-TW`），一鍵切換
- PWA（Manifest + Service Worker，離線頁面）
- 匯出結果 CSV、可嵌入 `iframe` 的極簡頁面
- 完整 JSON API + `ETag` 結果回應，可快取/再驗證
- 安全最佳化：CSP、HSTS、GZip、CORS、Trusted Host（環境變數 `ALLOWED_HOSTS`）

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

## 環境變數
- `DATABASE_URL`：預設 `sqlite:///./pulsepoll.db`
- `ALLOWED_HOSTS`：例如 `example.com,.example.org`（啟用 TrustedHostMiddleware）

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
│  │  ├─ embed.html
│  │  ├─ offline.html
│  │  └─ trending.html
│  └─ static/
│     ├─ app.js
│     ├─ sw.js
│     ├─ logo.svg
│     └─ manifest.webmanifest
├─ tests/
│  └─ test_api.py
├─ docs/
│  ├─ api.md
│  ├─ architecture.md
│  ├─ deployment.md
│  └─ contributing.md
├─ requirements.txt
└─ README.md
```

## API 概覽
- `POST /api/polls` 建立投票
- `GET /api/polls/{code}` 查詢投票
- `POST /api/polls/{code}/vote` 投票
- `GET /p/{code}/results` 取得投票結果（支援 `ETag`）
- `GET /p/{code}/events` SSE 即時結果
- `GET /p/{code}/export.csv` 匯出 CSV
- `GET /e/{code}` 內嵌顯示

## 安全/可擴展性
- 建議生產環境使用 Postgres、Redis（速率限制、事件推播）
- 前置反向代理（Nginx/Caddy），設定 HTTPS 與 Forwarded Headers
- 可替換 SSE 為 WebSocket / PubSub（多節點）

## 授權
MIT