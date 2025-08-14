# PulsePoll API

Base URL: `/`

## Create Poll
POST `/api/polls`

Request JSON:
```json
{
  "question": "Your question?",
  "options": ["A", "B", "C"]
}
```

Response:
```json
{ "code": "abc1234" }
```

## Get Poll
GET `/api/polls/{code}`

Response:
```json
{
  "code": "abc1234",
  "question": "Your question?",
  "options": [{"id": 1, "text": "A"}, {"id": 2, "text": "B"}]
}
```

## Vote
POST `/api/polls/{code}/vote`

Request JSON:
```json
{ "option_id": 1 }
```

Response:
```json
{ "status": "ok" }
```

## Results
GET `/p/{code}/results`

- Supports conditional requests via `ETag` and `If-None-Match`

Response:
```json
{
  "poll": "abc1234",
  "total": 20,
  "options": [
    {"id": 1, "text": "A", "count": 8},
    {"id": 2, "text": "B", "count": 12}
  ]
}
```

## Server-Sent Events (Realtime)
GET `/p/{code}/events`

- Media type: `text/event-stream`
- Emits results payload every ~2s for ~4 minutes
data lines example:
```
data: {"total": 3, "options": [{"id":1,"text":"A","count":1}, ...]}
```

## Export CSV
GET `/p/{code}/export.csv`
- Downloads a CSV file of aggregated results

## Embed View
GET `/e/{code}`
- Minimal HTML suitable for iframes to display live results

Notes:
- Cookie `voter_id` 限制同一投票者僅記錄一筆選擇（可更新）
- Rate limit: 建立投票 API 每小時每 IP 100 次；頁面表單為每小時 20 次
- `X-Forwarded-For` 用於代理後的 IP 解析