@echo off
chcp 65001 >nul
REM ============================================================
REM  Day toan bo code len GitHub repo cua ban.
REM  Repo: https://github.com/khoanguyen2707/app_dat_com_trua
REM  Cach dung: double-click file nay (hoac chay trong terminal).
REM  Lan dau git push se hien cua so dang nhap GitHub -> dang nhap la xong.
REM ============================================================

cd /d "%~dp0"
echo Thu muc: %cd%
echo.

REM --- Kiem tra git ---
git --version >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Git. Tai tai: https://git-scm.com/download/win
  pause
  exit /b 1
)

REM --- Xoa .git hong (neu co, do tao tu moi truong khac) ---
if exist ".git" (
  echo Xoa .git cu...
  rmdir /s /q ".git"
)

REM --- Khoi tao + commit ---
git init -b main
git config user.name  "khoanguyen2707"
git config user.email "khoanguyenintel@gmail.com"
git add -A
git commit -m "init: full-stack dat com trua (NestJS 11 + Prisma 7 + React/Vite)"

REM --- Gan remote ---
git remote remove origin >nul 2>nul
git remote add origin https://github.com/khoanguyen2707/app_dat_com_trua.git

echo.
echo === Dang day len GitHub (co the hien cua so dang nhap) ===
git push -u origin main

echo.
if errorlevel 1 (
  echo [CHUA XONG] Push that bai - thuong do chua dang nhap GitHub.
  echo  - Cai "Git Credential Manager" hoac dang nhap GitHub roi chay lai file nay.
  echo  - Hoac chay thu cong:  git push -u origin main
) else (
  echo [XONG] Da day len: https://github.com/khoanguyen2707/app_dat_com_trua
)
echo.
pause
