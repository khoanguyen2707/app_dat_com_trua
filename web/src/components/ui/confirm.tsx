import { createRoot } from 'react-dom/client';
import { ConfirmDialog, type ConfirmOptions } from './ConfirmDialog';

export type { ConfirmOptions };

/**
 * Thay cho `confirm()` gốc trình duyệt: cùng kiểu dùng "gọi thẳng, không cần provider"
 * như `toast()`, nhưng render bằng chính `Modal` nên trông đồng bộ với phần còn lại
 * của app (và trên mobile là bottom-sheet chứ không phải hộp thoại hệ điều hành).
 *
 *   if (!(await confirmDialog({ title, message, danger: true }))) return;
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (ok: boolean) => {
      resolve(ok);
      // Tháo ở nhịp sau: unmount ngay trong lúc React đang render sẽ báo lỗi.
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 0);
    };
    root.render(<ConfirmDialog opts={opts} done={done} />);
  });
}
