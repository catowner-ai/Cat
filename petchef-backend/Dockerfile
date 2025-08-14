# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
COPY openapi.yaml ./openapi.yaml
RUN npm i -g pnpm@9 && pnpm i --frozen-lockfile || pnpm i && pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/dist ./dist
EXPOSE 8787
CMD ["node", "dist/index.js"]