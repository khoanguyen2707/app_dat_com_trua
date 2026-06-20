# 🔗 Đẩy code lên GitHub

Repo đích: **https://github.com/khoanguyen2707/app_dat_com_trua**

> Lưu ý: trong thư mục có thể có sẵn một thư mục `.git` **hỏng** (tạo lỗi từ môi trường khác). Cứ làm theo dưới đây — bước đầu sẽ xoá nó đi và tạo lại sạch.

---

## Cách 1 — Một chạm (khuyến nghị)
Double-click **`push-to-github.bat`** ở thư mục gốc. Lần đầu sẽ hiện cửa sổ đăng nhập GitHub → đăng nhập là xong.

## Cách 2 — Lệnh thủ công
Mở **Git Bash** / **PowerShell** tại thư mục gốc dự án rồi chạy:

```bash
# Xoá .git hỏng (nếu có)
rm -rf .git          # PowerShell: Remove-Item -Recurse -Force .git

git init -b main
git add -A
git commit -m "init: full-stack dat com trua (NestJS 11 + Prisma 7 + React/Vite)"
git remote add origin https://github.com/khoanguyen2707/app_dat_com_trua.git
git push -u origin main
```

---

## Xác thực GitHub (nếu push báo lỗi đăng nhập)
- **Đơn giản nhất**: cài **Git for Windows** (kèm *Git Credential Manager*) → lần push đầu nó mở trình duyệt cho bạn đăng nhập GitHub.
- **Hoặc dùng Personal Access Token (PAT)**:
  1. GitHub → Settings → Developer settings → **Personal access tokens** → tạo token có quyền `repo`.
  2. Khi `git push` hỏi *Username* = `khoanguyen2707`, *Password* = **dán token** (không phải mật khẩu GitHub).

## Lỗi thường gặp
| Báo lỗi | Xử lý |
|---------|-------|
| `remote origin already exists` | `git remote set-url origin https://github.com/khoanguyen2707/app_dat_com_trua.git` |
| `Authentication failed` | Dùng PAT hoặc cài Git Credential Manager (xem trên). |
| `failed to push some refs` / `rejected` | Repo trên GitHub đã có commit. Kéo về trước: `git pull --rebase origin main` rồi push lại. |
| `src refspec main does not match any` | Chưa commit. Chạy lại `git add -A && git commit -m "init"`. |

---

## Sau khi push xong
- CI tự chạy (`.github/workflows/ci.yml`) build cả **server** và **web** → xem tab **Actions** trên GitHub để chắc chắn "mượt mà".
- Tiếp theo deploy cho mọi người dùng: xem [DEPLOY.md](./DEPLOY.md).
