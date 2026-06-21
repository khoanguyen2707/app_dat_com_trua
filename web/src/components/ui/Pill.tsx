import type { ReactNode } from 'react';

/** Nhãn trạng thái nhỏ (admin / user) */
export function Pill({ kind, icon, children }: { kind: 'admin' | 'user'; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`pill ${kind}`}>
      {icon} {children}
    </span>
  );
}
