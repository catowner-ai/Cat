# TinyWins — 全球都會愛用的微任務小確幸 App

TinyWins 是一個以「1-3 分鐘可完成」的微任務為核心的趣味與實用並重的 App。
每天自動為你生成 3x3 任務棋盤（Bingo），完成即可累積分數與連勝天數，還能匯出行事曆提醒與社群分享卡。

- 多語言介面：繁體中文 / English / Español
- 無帳號即可使用：資料儲存在本地 `data/tinywins.db`
- 特色功能：
  - 每日 3x3 任務棋盤（可重擲）
  - 完成打勾、分數與連勝（streak）
  - 進度視覺化（最近 14 天）
  - 下載分享卡（PNG）
  - 匯出 ICS 行事曆（可匯入 Google/Apple 行事曆）

## 快速開始

1) 安裝依賴
```bash
pip install -r requirements.txt
```

2) 啟動（本機）
```bash
streamlit run app.py
```

3) 伺服器模式（CI 或雲端，無互動 UI 時）
```bash
streamlit run app.py --server.headless true --server.port 8501
```

打開瀏覽器進入顯示的本機網址即可使用。

## 資料位置
- SQLite: `data/tinywins.db`

## 注意事項
- 分享卡的中文字型在某些環境可能因系統字型缺失而使用替代字型顯示。若需最佳中文字體呈現，可在系統安裝支援 CJK 的字型後重新啟動。

## 授權
MIT License