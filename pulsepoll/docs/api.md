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

Notes:
- Cookie `voter_id` 用於限制同一投票者在同一投票中只記錄一筆選擇（可更新選擇）。
- Rate limit: 建立投票 API 每小時每 IP 100 次；頁面表單為每小時 20 次。