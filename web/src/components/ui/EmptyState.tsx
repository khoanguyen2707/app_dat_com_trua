import type { ReactNode } from 'react';

/** Trạng thái rỗng: icon lớn + nội dung mô tả */
export function EmptyState({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="empty">
      <div className="e">{icon}</div>
      {children}
    </div>
  );
}
