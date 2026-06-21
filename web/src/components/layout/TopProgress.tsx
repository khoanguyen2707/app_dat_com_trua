import { useEffect, useState } from 'react';
import { onInflight } from '@/services/http';
import { cls } from '@/lib/format';

/** Thanh tiến trình mảnh trên đỉnh màn hình — hiện khi có request API đang chạy. */
export function TopProgress() {
  const [active, setActive] = useState(false);
  useEffect(() => onInflight((n) => setActive(n > 0)), []);
  return <div className={cls('topprogress', active && 'on')} aria-hidden="true" />;
}
