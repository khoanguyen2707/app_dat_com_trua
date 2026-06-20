# 🍱 Chạy local — Đặt Cơm Trưa

Hướng dẫn chạy dự án ở máy + **những gì đã phải sửa để chạy được** (Prisma 7 + Docker + trùng cổng). Dùng làm tài liệu cho cả nhóm khi clone về.

---

## ⚡ Chạy nhanh (1 lệnh)

Yêu cầu: **Docker Desktop đang chạy** (icon xanh).

```bash
docker compose up --build
```

| Thành phần | URL |
|------------|-----|
| Web | **http://localhost:8088** ⚠️ *(8088, không phải 8080)* |
| API + Swagger | **http://localhost:3000/docs** |
| Healthcheck | http://localhost:3000/health |

Lần đầu chạy hệ thống **tự seed**: tài khoản admin + 13 thành viên + tuần mẫu 15–20/6/2026 (33 suất, 825.000đ).

### Tài khoản mặc định

| Vai trò | Email | Mật khẩu |
|--------|-------|----------|
| Admin | `admin@comtrua.vn` | `admin123` |
| Thành viên | `khoa@comtrua.vn`, `chuong@comtrua.vn`, … | `123456` |

> Dừng: `Ctrl+C` rồi `docker compose down`. Xoá sạch cả dữ liệu DB: `docker compose down -v`.

---

## 🔧 Chạy thủ công (dùng Postgres cài sẵn trên máy)

**Backend**
```bash
cd server
cp .env.example .env          # sửa DATABASE_URL trỏ tới Postgres của bạn
npm install                   # postinstall tự chạy `prisma generate`
npm run prisma:push           # đồng bộ schema -> tạo bảng
npm run start:dev             # API tại http://localhost:3000
```

**Frontend** (cửa sổ terminal khác)
```bash
cd web
npm install
npm run dev                   # web tại http://localhost:5173 (proxy /api -> :3000)
```

---

## 🩹 Những gì đã phải sửa để chạy được

Dự án viết theo **Prisma 7** nhưng vài chỗ còn theo kiểu cũ, cộng với việc **máy bị trùng cổng**. Đây là 6 chỗ đã chỉnh (đã nằm sẵn trong repo — ghi lại để hiểu lý do):

| # | Vấn đề | Đã sửa ở đâu | Chi tiết |
|---|--------|--------------|----------|
| 1 | Docker chưa chạy → lỗi `dockerDesktopLinuxEngine` | *(không phải code)* | Bật **Docker Desktop** và đợi đến khi sẵn sàng. |
| 2 | Prisma 7 **bỏ `url` trong `datasource`** của `schema.prisma` | `server/prisma/schema.prisma` + `server/prisma.config.ts` | Trong schema chỉ còn `provider = "postgresql"`. Connection URL khai trong `prisma.config.ts` (`datasource.url`) cho CLI (`db push` / `studio`). |
| 3 | Prisma 7 **không tự nạp `.env`** nữa | `server/package.json` + `server/prisma.config.ts` | Thêm `dotenv` và `import 'dotenv/config'` ở đầu `prisma.config.ts` để CLI đọc được `DATABASE_URL`. |
| 4 | Prisma 7 **bỏ cờ `--skip-generate`** ở `db push` + image runtime thiếu file config | `server/Dockerfile` | Build stage chạy `npx prisma generate`; CMD đổi thành `npx prisma db push && node dist/main`; **COPY `prisma.config.ts`** vào cả stage build lẫn runtime. |
| 5 | `rootDir` build sai → không ra `dist/main.js` | `server/tsconfig.build.json` | Đặt `rootDir: ./src` và **exclude `prisma.config.ts`** (file này nằm ngoài `src`, nếu lọt vào sẽ kéo output thành `dist/src/main.js`). |
| 6 | **Trùng cổng** | `docker-compose.yml` | Postgres **không publish** ra host (API nối qua mạng nội bộ `postgres:5432`) vì máy đã có Postgres ở 5432/5433. Web đổi **8080 → 8088** vì 8080 bị `AgentService` chiếm. |

---

## 🆘 Lỗi thường gặp → cách xử lý

| Triệu chứng | Nguyên nhân | Xử lý |
|-------------|-------------|-------|
| `...dockerDesktopLinuxEngine...` / `Cannot connect to the Docker daemon` | Docker Desktop chưa chạy | Bật Docker Desktop, đợi icon xanh rồi chạy lại. |
| `port is already allocated` / `bind: address already in use` | Cổng 8088 hoặc 3000 đang bị chiếm | Đổi cổng publish trong `docker-compose.yml` (vd `8090:80`), hoặc tắt app đang giữ cổng. |
| `Environment variable not found: DATABASE_URL` | Chạy CLI Prisma mà chưa có `.env` | `cd server && cp .env.example .env`. (Bản Docker đã truyền sẵn `DATABASE_URL`.) |
| `@prisma/client did not initialize yet` / thiếu client | Chưa generate client | `cd server && npx prisma generate`. |
| Build xong nhưng `dist/main.js` không tồn tại | `rootDir` sai (xem fix #5) | Kiểm tra `tsconfig.build.json` có `rootDir: ./src` và exclude `prisma.config.ts`. |
| API chạy nhưng web gọi 404 | Sai prefix | API có prefix **`/api/v1`** (trừ `/health`). FE gọi `BASE = VITE_API_URL + /api/v1`. |

---

## 🧩 Ghi chú kỹ thuật (Prisma 7)

- **Schema vs URL tách rời**: `schema.prisma` chỉ khai `provider`; URL nằm ở `prisma.config.ts` (CLI) và biến môi trường `DATABASE_URL` (runtime).
- **Runtime dùng driver adapter**: `PrismaService` kết nối Postgres qua `@prisma/adapter-pg` (xem `server/src/prisma/prisma.service.ts`), không dùng `datasource.url` lúc chạy.
- **Prisma client output**: sinh ra `server/src/generated/prisma` (đã `.gitignore`).
- **API prefix**: tất cả route dưới `/api/v1`, riêng `/health` để ngoài cho healthcheck của Docker/Render.

---

## 📜 Lệnh hữu ích

```bash
# server
npm run start:dev      # dev watch
npm run build          # build production -> dist/
npm run lint           # oxlint + eslint
npm run prisma:studio  # xem/sửa DB bằng giao diện
npm run prisma:push    # đồng bộ schema -> DB

# web
npm run dev            # dev (http://localhost:5173)
npm run build          # build tĩnh -> dist/

# docker
docker compose up --build      # chạy full-stack
docker compose logs -f api     # xem log API
docker compose down -v         # dừng + xoá dữ liệu DB
```

> 👉 Deploy cho mọi người dùng chung: xem [DEPLOY.md](./DEPLOY.md).
