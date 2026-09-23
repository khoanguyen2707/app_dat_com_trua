import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton, Modal } from '@/components/ui';

const PANEL_W = 400;
const GAP = 8;
const MARGIN = 12;

/**
 * Khung chứa phiếu chi tiết một ngày.
 *
 * Có `anchor` (ô trong bảng tuần ở desktop) → popover neo ngay cạnh ô đó, để sửa
 * một ô không phải mở hộp thoại che kín bảng. Không có → Modal như cũ (mobile,
 * nơi bảng được thay bằng danh sách và Modal đã là bottom-sheet).
 */
export function DetailShell({
  anchor,
  title,
  onClose,
  children,
}: {
  anchor: DOMRect | null;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(null);

  // Đo trước khi trình duyệt vẽ → popover không nhấp nháy ở vị trí sai.
  useLayoutEffect(() => {
    if (!anchor) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = vh - anchor.bottom - GAP - MARGIN;
    const above = anchor.top - GAP - MARGIN;
    // Chỗ nào rộng hơn thì mở về phía đó; luôn chừa MARGIN với mép màn hình.
    const openDown = below >= above;
    const maxH = Math.max(220, Math.min(560, openDown ? below : above));
    const h = ref.current?.offsetHeight ?? maxH;
    const top = openDown ? anchor.bottom + GAP : Math.max(MARGIN, anchor.top - GAP - Math.min(h, maxH));
    const left = Math.min(Math.max(MARGIN, anchor.left + anchor.width / 2 - PANEL_W / 2), vw - PANEL_W - MARGIN);
    setPos({ left, top, maxH });
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    // mousedown ở nhịp capture: bắt cả click vào ô khác trong bảng
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [anchor, onClose]);

  if (!anchor) {
    return (
      <Modal open title={title} onClose={onClose}>
        {children}
      </Modal>
    );
  }

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      className="fixed z-50 flex flex-col overflow-hidden rounded-ui-lg border border-line bg-surface shadow-lg"
      style={{ width: PANEL_W, left: pos?.left ?? -9999, top: pos?.top ?? -9999, maxHeight: pos?.maxH }}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0 flex-1 text-sm font-semibold">{title}</div>
        <IconButton onClick={onClose} aria-label="Đóng">
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="overflow-y-auto p-3">{children}</div>
    </div>,
    document.body,
  );
}
