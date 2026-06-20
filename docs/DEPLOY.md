# 🚀 Deploy cho mọi người dùng chung — Đặt Cơm Trưa

Mục tiêu: đưa app lên Internet, có **HTTPS**, ai cũng đăng nhập được. Combo **miễn phí** ổn định nhất: **Neon** (PostgreSQL free, không hết hạn) + **Render** (API + web tĩnh free). Repo đã có sẵn `render.yaml` nên Render dựng gần như tự động.

---

## 🗺️ Kiến trúc khi deploy

```
[ Trình duyệt ] --HTTPS--> [ com-trua-web ]   (static, React build)
                                  |
                                  |  gọi API qua VITE_API_URL
                                  v
                           [ com-trua-api ]    (Docker, NestJS)  --> [ Neon Postgres ]
```

Khác với chạy local (nginx proxy `/api` cùng origin), khi deploy **web và API khác origin** → bắt buộc cấu hình đúng **`VITE_API_URL`** (cho web) và **`CORS_ORIGIN`** (cho API).

---

## ✅ Phương án khuyến nghị: Render (Blueprint) + Neon

### Chuẩn bị — đẩy code lên GitHub
Chạy file **`push-to-github.bat`** ở thư mục gốc (double-click trên Windows), hoặc xem lệnh thủ công trong [GIT-PUSH.md](./GIT-PUSH.md). Repo đích:
`https://github.com/khoanguyen2707/app_dat_com_trua`

### Bước 1 — Tạo database free trên Neon
1. Vào https://neon.tech → đăng ký → **New Project**.
2. Copy **Connection string**, dạng:
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
3. Giữ lại chuỗi này cho Bước 3.

> Vì sao Neon: Postgres free của Render **hết hạn sau ~30 ngày**, còn Neon free **không hết hạn** → hợp app dùng lâu dài.

### Bước 2 — Tạo service trên Render bằng Blueprint
1. Vào https://render.com → đăng ký bằng GitHub (**không cần thẻ**).
2. **New → Blueprint** → chọn repo `app_dat_com_trua`.
3. Render đọc `render.yaml` và tạo **2 service**: `com-trua-api` (Docker) và `com-trua-web` (static).

### Bước 3 — Điền biến môi trường
Khi được hỏi, điền các biến để `sync: false`:

**`com-trua-api`**
| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | chuỗi Neon ở Bước 1 |
| `ADMIN_PASSWORD` | mật khẩu admin **mạnh** (khác `admin123`) |
| `CORS_ORIGIN` | URL web — điền sau khi biết (vd `https://com-trua-web.onrender.com`) |

> `JWT_*_SECRET` Render **tự sinh** (`generateValue`). `SEED_DEMO` đang `true` cho lần đầu.

**`com-trua-web`**
| Biến | Giá trị |
|------|---------|
| `VITE_API_URL` | URL API (vd `https://com-trua-api.onrender.com`) |

### Bước 4 — Xử lý "con gà & quả trứng" của URL
Lần deploy đầu bạn chưa biết URL thật. Cách làm:
1. Deploy lần 1 (cứ để trống `CORS_ORIGIN`/`VITE_API_URL` hoặc điền tạm).
2. Vào Dashboard lấy **URL thật** của cả 2 service.
3. Cập nhật lại:
   - `com-trua-api` → `CORS_ORIGIN` = URL web → **redeploy API** (đổi env là đủ).
   - `com-trua-web` → `VITE_API_URL` = URL API → **Manual Deploy → Clear build cache & deploy** *(quan trọng: `VITE_API_URL` nhúng lúc **build**, nên phải build lại web)*.

### Bước 5 — Kiểm tra
- Mở `https://<api>/health` → trả `ok`.
- Mở `https://<api>/docs` → Swagger.
- Mở URL web → **đăng ký / đăng nhập**. Xong! 🎉

> ⏰ Service free **ngủ sau 15 phút** không dùng → request đầu chờ ~30–60s rồi chạy lại bình thường (đủ tốt cho app nội bộ).

### Bước 6 — (Tuỳ chọn) Tên miền riêng + HTTPS
Giả sử mua `comtrua.vn`:
1. Render → **com-trua-web → Settings → Custom Domains → Add** `comtrua.vn` (+ `www`).
2. Theo bản ghi DNS Render hiển thị, thêm ở nhà cung cấp tên miền:
   - `CNAME  www  →  <target>.onrender.com`
   - Tên miền gốc: dùng ALIAS/ANAME hoặc redirect theo hướng dẫn Render.
3. (Khuyến nghị) Thêm `api.comtrua.vn` trỏ vào **com-trua-api**, rồi đổi `VITE_API_URL=https://api.comtrua.vn` và `CORS_ORIGIN=https://comtrua.vn` → deploy lại.
4. HTTPS (Let's Encrypt) Render **tự cấp** sau khi DNS trỏ đúng.

---

## 🔒 Checklist bảo mật trước khi mở cho mọi người

- [ ] `ADMIN_PASSWORD` mạnh, khác `admin123`.
- [ ] `DEFAULT_PASSWORD` đổi (mật khẩu mặc định cho thành viên seed).
- [ ] `JWT_ACCESS_TOKEN_SECRET` / `JWT_REFRESH_TOKEN_SECRET` không dùng giá trị dev — Render `generateValue` đã lo việc này.
- [ ] `CORS_ORIGIN` = **đúng** origin web, **không để `*`** khi đã có domain thật.
- [ ] Sau khi xong dữ liệu thật: đặt `SEED_DEMO=false` (tránh seed lại demo trên DB mới) và xoá 13 thành viên mẫu nếu cần.
- [ ] Đổi mật khẩu admin ngay sau lần đăng nhập đầu.

---

## 🔁 Phương án thay thế

**Railway** — https://railway.app
New Project → Deploy from GitHub → thêm plugin **PostgreSQL** (tự có `DATABASE_URL`). Tạo 2 service từ thư mục `server` và `web`. Có credit dùng thử/tháng, gắn tên miền dễ.

**VPS riêng + Docker + Caddy** (tự chủ, đã có server)
```bash
docker compose up -d
```
Đặt Caddy phía trước để auto-HTTPS:
```
comtrua.vn {
    reverse_proxy localhost:8088
}
```
Trỏ A record của tên miền về IP VPS trước; Caddy tự xin SSL.

---

## ❓ Vì sao chọn Render + Neon
Miễn phí, DB không hết hạn (Neon), HTTPS tự động, `render.yaml` dựng sẵn, hợp app nội bộ vài chục người. Khi cần "luôn bật" (không ngủ) thì nâng API lên gói trả phí thấp nhất của Render là đủ.

> 👉 Chạy local & xử lý lỗi: xem [CHAY-LOCAL.md](./CHAY-LOCAL.md).
