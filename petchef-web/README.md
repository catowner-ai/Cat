# PetChef Web (冰箱萌廚網頁版)

Minimal bilingual React app (Vite + TS) that consumes PetChef API.

## Run / 執行

Backend first:
- Start API at `http://localhost:8787` (see `../petchef-backend/README.md`)

Then web:
```bash
npm i # or pnpm i / yarn
npm run dev
```
Open `http://localhost:5173`.

Proxy is configured for `/v1` → `http://localhost:8787`.