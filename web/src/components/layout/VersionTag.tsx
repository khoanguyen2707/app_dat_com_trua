import { AlertTriangle } from 'lucide-react';
import { t } from '@/constants/strings';
import { cn } from '@/lib/cn';
import { useVersion } from '@/hooks/useVersion';

/**
 * Bản đang chạy, đặt ở chỗ khuất nhưng luôn nhìn thấy được.
 *
 * Trả lời đúng một câu: app đã cập nhật chưa. Rê chuột để xem commit và lúc build;
 * web và API lệch bản thì nói thẳng, vì đó là lúc mọi thứ hỏng theo kiểu khó hiểu
 * nhất — giao diện mới gọi một endpoint mà bản API cũ chưa có.
 */
export function VersionTag({ className }: { className?: string }) {
  const { web, commit, builtAt, api, mismatch } = useVersion();
  const built = new Date(builtAt);
  const builtLabel = Number.isNaN(built.getTime()) ? builtAt : built.toLocaleString('vi-VN');

  return (
    <div
      className={cn('text-[11px] text-ink-4', mismatch && 'font-medium text-warn', className)}
      title={t.version.tooltip(commit, builtLabel, api ?? '—')}
    >
      {mismatch ? (
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="size-3 shrink-0" />
          {t.version.mismatch(web, api ?? '—')}
        </span>
      ) : (
        t.version.label(web)
      )}
    </div>
  );
}
