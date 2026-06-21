# 🍱 Đặt Cơm Trưa — Full-stack (NestJS + Prisma + React)

Ứng dụng đặt cơm trưa cho nhóm: mỗi người **tự đăng ký tài khoản**, **tích ngày ăn theo tuần** (mix nhiều món/ngày vẫn 1 suất, thêm **đồ uống** tính tiền riêng), hệ thống **tự tính suất & tiền**. **Khoá đặt theo giờ/ngày** (chỉ đặt hôm nay trước giờ chốt 10:21). **Thanh toán QR** (VietQR điền sẵn số tiền) theo quy trình **user báo đã chuyển → admin xác nhận**, kèm **chuông thông báo**. Có thống kê, lịch sử tuần (xem lại read-only). **Admin** quản lý món ăn, thành viên, đơn giá, thông tin thanh toán, phân quyền.

| Phần | Công nghệ |
|------|-----------|
| Backend (`server/`) | NestJS 11, Prisma 7 (PostgreSQL), JWT access/refresh, RBAC (ADMIN/USER), Swagger |
| Frontend (`web/`) | React 18 + Vite + TypeScript |
| Hạ tầng | Docker, docker-compose, GitHub Actions CI, render.yaml |

> `index.html` ở thư mục gốc là **bản chạy offline 1 file** (không cần server) — giữ lại để dùng nhanh.

## 📚 Tài liệu

> Thư mục `docs/` là **tài liệu nội bộ** (đã `.gitignore`). Nguồn là `.md`; chạy `node docs/build-docs.mjs` để sinh lại bản `.html` (cùng style + điều hướng).

- [docs/NGHIEP-VU.md](docs/NGHIEP-VU.md) — **nghiệp vụ**: đặt cơm, khoá giờ/ngày, mix món + đồ uống, thanh toán + thông báo
- [docs/CHAY-LOCAL.md](docs/CHAY-LOCAL.md) — chạy local + các lỗi đã gặp & cách sửa (Prisma 7, Docker, cổng, IPv4)
- [docs/DEPLOY.md](docs/DEPLOY.md) — deploy cho mọi người dùng chung (Render + Neon, free + HTTPS)
- [docs/GIT-PUSH.md](docs/GIT-PUSH.md) — đẩy code lên GitHub
- [docs/VAN-HANH.md](docs/VAN-HANH.md) — vận hành & hạ tầng (CI/CD, giới hạn Neon, backup)

---

## 1. Cấu trúc dự án

```
com-trua-app/
├─ server/            # API NestJS + Prisma
│  ├─ src/ (auth, users, weeks, orders, dishes, payment, notifications, seed, common, prisma)
│  ├─ prisma/schema.prisma
│  └─ Dockerfile
├─ web/               # Frontend React + Vite (src, Dockerfile + nginx.conf)
├─ docker-compose.yml # chạy full-stack 1 lệnh
├─ render.yaml        # deploy Render (free)
└─ .github/workflows/ci.yml
```

---

## 2. Chạy nhanh tại máy (cần Docker Desktop đang chạy)

```bash
docker compose up --build
```

- Web: **http://localhost:8088**
- API + Swagger: **http://localhost:3000/docs**
- Postgres tự bật trong compose (không cần cài gì thêm).

Lần đầu chạy sẽ **tự seed**: admin + 13 thành viên + **thực đơn 25 món ăn/đồ uống** + tuần mẫu 15–20/6/2026.

### Tài khoản mặc định

| Vai trò | Email | Mật khẩu |
|--------|-------|----------|
| Admin | `admin@comtrua.vn` | `admin123` |
| Thành viên | `khoa@comtrua.vn`, `chuong@comtrua.vn`, … | `123456` |

> Chi tiết + xử lý lỗi: [docs/CHAY-LOCAL.md](docs/CHAY-LOCAL.md). Đổi `ADMIN_PASSWORD` trước khi deploy thật.

---

## 3. Chạy thủ công (dùng Postgres cài sẵn)

**Backend**
```bash
cd server
cp .env.example .env          # DATABASE_URL: dùng 127.0.0.1 (KHÔNG localhost — xem docs/CHAY-LOCAL.md)
npm install
npm run prisma:push           # tạo bảng theo schema
npm run start:dev             # API tại http://localhost:3000
```

**Frontend** (terminal khác)
```bash
cd web
npm install
npm run dev                   # web tại http://localhost:5173 (proxy /api -> :3000)
```

---

## 4. 🚀 Deploy cho mọi người dùng chung

Combo free ổn định: **Neon** (PostgreSQL free, không hết hạn) + **Render** (API + web tĩnh free, tự HTTPS). Repo có sẵn `render.yaml`.

> 📖 **Hướng dẫn từng bước chi tiết: [docs/DEPLOY.md](docs/DEPLOY.md).** Tóm tắt:

1. **Đẩy code lên GitHub** — chạy `push-to-github.bat` (xem [docs/GIT-PUSH.md](docs/GIT-PUSH.md)).
2. **Neon** → tạo project → copy **Connection string** (`DATABASE_URL`).
3. **Render → New → Blueprint** → chọn repo → tạo `com-trua-api` + `com-trua-web`. Điền:
   - API: `DATABASE_URL` (Neon), `ADMIN_PASSWORD` (mạnh), `CORS_ORIGIN` (URL web).
   - Web: `VITE_API_URL` (URL API). *Đổi `VITE_API_URL` phải build lại web (nó nhúng lúc build).*
4. **Tên miền + HTTPS**: Render → Custom Domains → thêm domain; SSL Let's Encrypt tự cấp sau khi trỏ DNS.

> API free **ngủ sau 15 phút** → request đầu chờ ~30–60s (đủ tốt cho app nội bộ).

---

## 5. Lựa chọn deploy khác

- **Railway** (https://railway.app): Deploy from GitHub + plugin PostgreSQL (tự có `DATABASE_URL`).
- **VPS + Docker + Caddy**: `docker compose up -d` rồi đặt Caddy auto-HTTPS:
  ```
  comtrua.vn { reverse_proxy localhost:8088 }
  ```

---

## 6. API & phân quyền

- Swagger UI: `/docs` — bấm **Authorize** dán access token.
- API prefix: **`/api/v1`** (riêng `/health` để ngoài cho healthcheck).
- Mọi route (trừ `/health`, `/auth/register`, `/auth/login`, `/auth/refresh`) cần **Bearer token**.
- Route `@Roles(ADMIN)` chỉ admin gọi được.

| Nhóm | Endpoint chính |
|------|----------------|
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` · `POST /auth/change-password` |
| Tuần | `GET /weeks/active` · `GET /weeks` · `GET /weeks/:id/grid` · `POST /weeks` · `PATCH/DELETE /weeks/:id` *(admin)* |
| Đặt cơm (của tôi) | `PUT /orders/me` (tick ngày) · `PUT /orders/me/day` (mix món + đồ uống) · `PATCH /orders/me/payment` (báo đã chuyển khoản) |
| Đặt hộ / xác nhận *(admin)* | `PUT /orders/:userId` · `PUT /orders/:userId/day` · `PATCH /orders/payment` (đặt trạng thái thanh toán + báo user) |
| Thực đơn | `GET /dishes` · `POST/PATCH/DELETE /dishes/:id` *(admin)* |
| Thanh toán | `GET /payment` · `PATCH /payment` *(admin)* |
| Thông báo | `GET /notifications` · `PATCH /notifications/read` |
| Thành viên | `GET /users` · `PATCH/DELETE /users/:id` *(admin)* |

---

## 7. Biến môi trường (server/.env)

| Biến | Ý nghĩa |
|------|---------|
| `DATABASE_URL` | Chuỗi kết nối Postgres |
| `JWT_ACCESS_TOKEN_SECRET` / `JWT_REFRESH_TOKEN_SECRET` | Khoá ký JWT (đổi khi deploy) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Tài khoản admin seed lần đầu |
| `DEFAULT_PASSWORD` | Mật khẩu mặc định cho thành viên seed |
| `SEED_DEMO` | `true` để seed mẫu (đặt `false` khi đã có dữ liệu thật) |
| `CORS_ORIGIN` | Origin của frontend (vd `https://comtrua.vn`) |

---

## 8. Lệnh hữu ích

```bash
# server
npm run start:dev      # dev watch
npm run build          # build production
npm run lint           # oxlint + eslint
npm run prisma:studio  # xem/sửa DB bằng giao diện
npm run prisma:push    # đồng bộ schema -> DB

# web
npm run dev            # dev
npm run build          # build tĩnh -> dist/
npm run lint           # eslint

# docs (tài liệu nội bộ) — sửa .md rồi sinh lại .html
node docs/build-docs.mjs
```
