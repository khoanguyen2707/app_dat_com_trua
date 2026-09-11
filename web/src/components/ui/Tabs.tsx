import type { ReactNode } from 'react';
import { cls } from '@/lib/format';

export type TabItem<K extends string> = { key: K; label: ReactNode };

/**
 * Dải tab — dùng lại đúng style `.seg` (segmented control) của màn đăng nhập
 * thay vì đẻ thêm một hệ style tab riêng.
 *
 * `inModal`: bỏ margin dọc mặc định để nằm gọn trong vùng header dính của Modal.
 */
export function Tabs<K extends string>({
  items,
  active,
  onChange,
  inModal = false,
}: {
  items: readonly TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  inModal?: boolean;
}) {
  return (
    <div className={cls('seg', inModal && 'seg-modal')} role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={active === it.key}
          className={cls(active === it.key && 'active')}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
