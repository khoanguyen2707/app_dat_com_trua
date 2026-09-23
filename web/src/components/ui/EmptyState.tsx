import type { ReactNode } from 'react';

/** Trạng thái rỗng: icon lớn + nội dung mô tả */
export function EmptyState({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-ink-3">
      <div className="text-ink-4 [&_svg]:size-8">{icon}</div>
      {children}
    </div>
  );
}
