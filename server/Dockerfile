# syntax=docker/dockerfile:1

# ---- build: cài deps, generate Prisma client, biên dịch ----
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY package.json ./
EXPOSE 3000
# Đồng bộ schema vào DB (db push) rồi khởi động API. Seed admin + dữ liệu mẫu chạy tự động trong main.ts
# Prisma 7: db push không còn cờ --skip-generate và không tự generate client nữa.
CMD ["sh", "-c", "npx prisma db push && node --enable-source-maps dist/main"]
