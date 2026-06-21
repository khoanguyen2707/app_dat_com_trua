import { useEffect, useRef, useState } from 'react';
import { onInflight } from '@/services/http';
import { cls } from '@/lib/format';
import { t } from '@/constants/strings';

type Phase = 'idle' | 'loading' | 'hiding';

/**
 * Toast loading gọn ở dưới (cùng chỗ/giao diện với toast kết quả):
 * có request API → hiện "Đang xử lý…" + spinner; xong → tự tắt (toast kết quả/lỗi lo phần báo xong).
 * Request nền (poll thông báo) dùng { silent: true } nên không kích hoạt cái này.
 */
export function ActivityIndicator() {
  const [phase, setPhase] = useState<Phase>('idle');
  const prev = useRef(0);
  const timer = useRef<number>();

  useEffect(() => {
    const off = onInflight((n) => {
      window.clearTimeout(timer.current);
      if (n > 0) {
        setPhase('loading');
      } else if (prev.current > 0) {
        setPhase('hiding'); // fade rồi gỡ
        timer.current = window.setTimeout(() => setPhase('idle'), 280);
      }
      prev.current = n;
    });
    return () => {
      off();
      window.clearTimeout(timer.current);
    };
  }, []);

  if (phase === 'idle') return null;
  return (
    <div className={cls('activity', phase === 'hiding' && 'hide')} aria-live="polite">
      <span className="activity-spin" aria-hidden="true" />
      <span>{t.activity.loading}</span>
    </div>
  );
}
