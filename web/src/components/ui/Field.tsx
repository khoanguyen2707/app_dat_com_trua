import type { ReactNode } from 'react';

/** Khối nhập liệu: nhãn + control (input/select truyền vào qua children) */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
