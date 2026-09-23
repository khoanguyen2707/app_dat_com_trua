import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Phiên bản đang chạy — để trả lời câu "API đã cập nhật chưa?" mà không phải đoán.
 *
 * Đọc từ package.json (CI tự tăng mỗi lần vào main) và biến `RENDER_GIT_COMMIT`
 * mà Render đặt sẵn cho mỗi lần deploy. Không có commit (chạy máy local) thì ghi
 * 'dev' chứ không bịa.
 */
function readVersion(): string {
  try {
    const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_VERSION = readVersion();
export const APP_COMMIT = (process.env.RENDER_GIT_COMMIT ?? '').slice(0, 7) || 'dev';
/** Lúc tiến trình khởi động — deploy mới thì mốc này nhảy theo. */
export const STARTED_AT = new Date().toISOString();
