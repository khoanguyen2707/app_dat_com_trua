# 🍱 Đặt Cơm Trưa — Full-stack (NestJS + Prisma + React)

Ứng dụng đặt cơm trưa cho nhóm: mỗi người **tự đăng ký tài khoản**, **tích ngày ăn theo tuần** (mix nhiều món/ngày vẫn 1 suất, thêm **đồ uống** tính tiền riêng), hệ thống **tự tính suất & tiền**. **Khoá đặt theo giờ/ngày** (chỉ đặt hôm nay trước giờ chốt 10:15). **Thanh toán QR** (VietQR điền sẵn số tiền) theo quy trình **user báo đã chuyển → admin xác nhận**, kèm **chuông thông báo**. Có thống kê, lịch sử tuần (xem lại; **vẫn thanh toán/đối soát tuần cũ nếu còn nợ**), và **chọn người đi lấy cơm xoay tua công bằng** (tag vào Microsoft Teams qua Power Automate). **Admin** quản lý món ăn, thành viên, đơn giá, thông tin thanh toán, phân quyền.

| Phần | Công nghệ |
|------|-----------|
| Backend (`server/`) | NestJS 11, Prisma 7 (PostgreSQL), JWT access/refresh, RBAC (ADMIN/USER), Swagger |
| Frontend (`web/`) | React 18 + Vite + TypeScript + Tailwind CSS v4 (token trong `src/theme.css`) + icon lucide |
| Hạ tầng | Docker, docker-compose, GitHub Actions CI, render.yaml |

> `index.html` ở thư mục gốc là **bản prototype offline 1 file** (không cần server) — *bản cũ, KHÔNG có các tính năng mới* (mix món, đồ uống, khoá giờ, trạng thái thanh toán, thông báo). Giữ lại để tham khảo nhanh; app thật là `server/` + `web/`.

## 📚 Tài liệu

> Thư mục `docs/` là **tài liệu nội bộ** (đã `.gitignore`). Nguồn là `.md`; chạy `node docs/build-docs.mjs` để sinh lại bản `.html` (cùng style + điều hướng).

- [docs/NGHIEP-VU.md](docs/NGHIEP-VU.md) — **nghiệp vụ**: đặt cơm, khoá giờ/ngày, mix món + đồ uống, thanh toán + thông báo, người đi lấy cơm (Teams)
- [docs/POWER-AUTOMATE.md](docs/POWER-AUTOMATE.md) — **Power Automate**: flow đăng thực đơn lên Teams + flow chốt người đi lấy cơm
- [docs/CHAY-LOCAL.md](docs/CHAY-LOCAL.md) — chạy local + các lỗi đã gặp & cách sửa (Prisma 7, Docker, cổng, IPv4)
- [docs/DEPLOY.md](docs/DEPLOY.md) — deploy cho mọi người dùng chung (Render + Neon, free + HTTPS)
- [docs/GIT-PUSH.md](docs/GIT-PUSH.md) — đẩy code lên GitHub
- [docs/VAN-HANH.md](docs/VAN-HANH.md) — vận hành & hạ tầng (CI/CD, giới hạn Neon, backup)

---

## 1. Cấu trúc dự án

```
com-trua-app/
├─ server/            # API NestJS + Prisma
│  ├─ src/ (auth, users, weeks, orders, dishes, payment, notifications, health, seed, common, prisma)
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

Lần đầu chạy sẽ **tự seed**: admin + 12 thành viên + **thực đơn 25 món ăn/đồ uống** + tuần mẫu 15–20/6/2026.

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
npm run db:push           # tạo bảng theo schema
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
| Lấy cơm | `POST /pickup/today` (bốc người, header `x-pickup-token`) · `GET /pickup/today` · `GET /pickup/history` *(admin)* · `GET /pickup/stats` *(admin — tỷ lệ đi lấy / số lần đặt của từng người)* |

> ⏰ **`POST /pickup/today` chỉ bốc SAU giờ chốt đặt cơm (10:15)** — gọi sớm hơn thì trả `picked: false` và **không ghi gì**, nên gọi lúc nào cũng an toàn. Lý do: mỗi ngày chỉ chốt được đúng 1 lượt và không có đường xoá, nên một cú gọi lúc 8h sáng (flow Power Automate lệch múi giờ, flow retry, hay thử endpoint trên Swagger) sẽ khoá cứng kết quả từ nhóm vài người tick sớm. Hẹn giờ flow **sau 10:15** (nhớ đặt đúng timezone — recurrence của Power Automate mặc định theo UTC).
| Gửi đơn cho quán | `POST /dispatch/today` (flow hỏi mức nhắc, header `x-pickup-token`) · `GET /dispatch/today` (xem, không ghi) · `POST /dispatch/today/sent-hook` (nút trong Teams) · `GET /dispatch/today/status` · `POST/DELETE /dispatch/today/sent` |
| Thành viên | `GET /users` · `PATCH/DELETE /users/:id` *(admin)* |

> **Quản lý thành viên**: admin vào **⚙️ Cài đặt → Thành viên** — tìm kiếm (gõ không dấu vẫn ra), sửa họ tên / màu đại diện, nhập **Email Teams**, bật tắt **tài khoản hoạt động**, **quyền admin**, **miễn đi lấy cơm**, kèm số liệu xoay tua của từng người (đã đặt / đã đi / tỷ lệ / lần cuối) và thứ hạng sắp tới lượt.
>
> ⚠️ **Email Teams** phải điền thì Power Automate mới @mention đúng người trong Teams. Bỏ trống → flow chỉ nhận được email đăng nhập app (vd `khoa@comtrua.vn`), thường không mention được. Xoá người khỏi app sẽ **xoá luôn** đơn/đồ uống/thông báo/lượt lấy cơm của họ (cascade) và làm đổi tổng suất & tổng tiền các tuần cũ — muốn giữ lịch sử thì tắt **Tài khoản hoạt động** thay vì xoá.

---

## 6b. Chống quên gửi đơn cho quán

**Vấn đề có thật:** đơn cơm được gửi thủ công qua Zalo. Hôm người phụ trách nghỉ, không ai gửi, cả nhóm không có cơm ăn — và **không ai biết cho tới lúc đói**.

**Vì sao không gửi tự động thẳng vào Zalo:** Zalo OA API không có endpoint đăng vào nhóm chat; gửi cho một người phải nằm trong cửa sổ đã tương tác; ZNS thì tốn phí, phải duyệt template và template quá ngắn để chở danh sách cả nhóm. Các thư viện "Zalo bot" điều khiển app cá nhân vi phạm điều khoản và dễ bị khoá tài khoản. Nên **cú gửi vẫn do người làm** — thứ được tự động hoá là *nhắc* và *phát hiện chưa ai làm*.

### Hai mốc thời gian

| Mốc | Giờ | Ý nghĩa |
|---|---|---|
| `CUTOFF_MINUTES` | **10:15** | Chốt đặt cơm trong app, danh sách hoàn chỉnh từ đây |
| `SHOP_DEADLINE_MINUTES` | **10:30** | Quán ngừng nhận đơn |

Chốt **phải sớm hơn** giờ quán đóng: khoảng giữa hai mốc chính là thời gian còn lại để gửi đơn. Bằng nhau thì không còn chỗ nào để gửi và cơ chế nhắc mất ý nghĩa. Sửa cả hai ở [`server/src/common/week-lock.ts`](server/src/common/week-lock.ts).

### Lịch nhắc — suy ra từ hai mốc, không cắm cứng

`POST /dispatch/today` trả về `level`, các mốc chia đều trong khoảng chốt → quán đóng nên cửa sổ hẹp thì tự co:

| level | Khi nào | Nội dung |
|---|---|---|
| `first` | ngay giờ chốt | Đơn hôm nay + nút "Đã gửi quán" |
| `second` | ⅓ quãng còn lại | Nhắc lại, kèm số phút còn lại |
| `escalate` | ⅔ quãng còn lại | Báo gấp, tag rộng hơn |
| `idle` | ngoài khung, đã gửi, mức đã nhắc rồi, hoặc **không ai đặt cơm** | Flow không phải làm gì |

Gọi lại trong cùng một mức trả `idle`, nên flow chạy 5 phút/lần cũng không spam. Sau `SHOP_DEADLINE` thì im — nhắc lúc đó chỉ gây hoảng chứ không cứu được bữa trưa.

### Gắn vào flow **Đặt cơm trưa - HTTP**

Phần nhắc nằm chung trong flow đăng thực đơn, không tách flow riêng. Chèn một **nhánh song song** ngay sau `Check_Health` (điểm này rơi đúng giờ chốt, vì `Delay_Until` phía trước đã chờ tới đó), để nhánh nhắc chạy song song với `Delay_1` → bốc người lấy cơm.

Nhánh nhắc gồm **ba khối giống hệt nhau**, cách nhau bởi **Delay 5 phút** — rơi vào khoảng 10:15 / 10:20 / 10:25:

1. **HTTP** `POST {APP_API}/dispatch/today`, header `x-pickup-token: <PICKUP_TOKEN>`
2. **Parse JSON** body trả về
3. **Condition** `level` khác `idle` mới đi tiếp
4. **Apply to each** trên `mentions` (bật *Concurrency = 1*) → **Get an @mention token for a user** (`userId` = `email`) → **Append to string variable**
5. **Post message in a chat or channel**: chuỗi mention + trường `html` (đã dựng sẵn ở server)

Không cần **Do until**: phần quyết định nằm ở server. Khối nào gọi mà đơn đã gửi, hoặc mức đó đã nhắc rồi, hoặc đã quá giờ quán đóng, thì API trả `level: "idle"` và `Condition` tự bỏ qua.

Thêm **Adaptive Card** nút "Đã gửi quán" → `POST {APP_API}/dispatch/today/sent-hook`, body `{ "email": "<người bấm>" }`. Không có nút này thì hệ thống không biết đơn đã đi và vẫn nhắc đủ ba lần.

> ⚠️ **Cái giá của việc gộp chung:** flow này chạy khi admin đăng thực đơn, không theo lịch. **Hôm nào không đăng thực đơn thì không có lời nhắc nào** — một điểm chết mới thay cho điểm chết cũ. Flow riêng dùng **Recurrence** thì không có điều kiện tiên quyết đó.

Trong app, khối **Đơn hôm nay** hiện dải trạng thái *"Chưa gửi cho quán"* / *"Đã gửi lúc 10:18 · Khoa"* và nút bấm tương ứng — cả nhóm nhìn thấy đơn đã đi hay chưa. Đây mới là thứ ngăn sự cố lặp lại, chứ không phải cái tin nhắn nhắc.

> Ngày không ai đặt cơm thì hệ thống **im hoàn toàn**. Đổi lại, một flow chết sẽ trông giống hệt một ngày không ai đặt — nếu muốn phân biệt thì cho flow ping một kênh log riêng.

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
| `PICKUP_TOKEN` | Token bí mật để Power Automate gọi `POST /pickup/today` (bốc người đi lấy cơm) **và** `POST /dispatch/today` (nhắc gửi đơn). Bỏ trống = cả hai endpoint từ chối mọi request |
| `MENU_WEBHOOK_URL` | URL trigger của flow Power Automate nhận thực đơn vừa đăng. Bỏ trống = tắt (vẫn đăng thực đơn bình thường, chỉ không báo Teams) |
| `MENU_WEBHOOK_TOKEN` | Bí mật gửi kèm header `x-menu-token` để flow chặn request lạ |
| `APP_URL` | Link app chèn vào tin nhắn Teams (vd `https://com-trua.vercel.app`) |

---

## 8. Lệnh hữu ích

```bash
# server
npm run start:dev      # dev watch
npm run build          # build production
npm run lint           # oxlint + eslint
npm run prisma:studio  # xem/sửa DB bằng giao diện
npm run db:push    # đồng bộ schema -> DB

# web
npm run dev            # dev
npm run build          # build tĩnh -> dist/
npm run lint           # eslint

# docs (tài liệu nội bộ) — sửa .md rồi sinh lại .html
node docs/build-docs.mjs
```
