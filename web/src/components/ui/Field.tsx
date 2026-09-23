import type { ReactNode } from 'react';

/**
 * Khối nhập liệu: nhãn + control. Kiểu dáng của input/select được cấp bởi
 * selector con ở đây nên nơi gọi chỉ cần truyền thẻ trần vào `children`.
 */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-3.5 [&_input,&_select,&_textarea]:h-9 [&_input,&_select,&_textarea]:w-full [&_input,&_select,&_textarea]:rounded-ui [&_input,&_select,&_textarea]:border [&_input,&_select,&_textarea]:border-line [&_input,&_select,&_textarea]:bg-surface [&_input,&_select,&_textarea]:px-3 [&_input,&_select,&_textarea]:text-sm [&_input,&_select,&_textarea]:outline-none focus-within:[&_input,&_select,&_textarea]:border-brand">
      <label className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</label>
      {children}
    </div>
  );
}
