# PetChef Backend (冰箱萌廚 API)

Bilingual Fastify + TypeScript API for fridge inventory, duo recipes (human + pet), and pet feeding utilities.

## Run / 執行

```bash
pnpm i # or npm i / yarn
pnpm dev # hot reload
# or build & start
pnpm build && pnpm start
```

Default port: `8787`

## Endpoints / 端點
- GET `/v1/health` → `{ ok: true }`
- GET `/v1/inventory` → 列出庫存
- POST `/v1/inventory` → 新增庫存
- PUT `/v1/inventory/:id` → 更新庫存
- DELETE `/v1/inventory/:id` → 刪除庫存
- GET `/v1/pets` → 列出寵物
- POST `/v1/pets` → 新增寵物
- GET `/v1/pets/:id/calories` → 該寵物每餐熱量估算
- GET `/v1/recipes` → 列出食譜
- POST `/v1/recipes` → 新增食譜
- GET `/v1/recipes/suggest?variant=human|pet` → 基於庫存與效期排序的推薦
- GET `/v1/duo/suggest` → 配對同基底的人用 + 寵用雙食譜

### Example / 範例
```bash
curl http://localhost:8787/v1/duo/suggest | jq
```

## Notes / 備註
- In-memory data only for MVP demo. 目前為記憶體資料示例。
- Pet calorie estimation is informational and not medical advice. 熱量估算僅供參考，非醫療建議。