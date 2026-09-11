import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cls } from '@/lib/format';
import { IconButton } from './IconButton';

/** Phần tử có thể nhận focus bên trong modal (dùng cho bẫy Tab). */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  title,
  subheader,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: ReactNode;
  /** Dải nội dung phụ nằm TRONG vùng header dính (vd tab của Cài đặt). */
  subheader?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Modal rộng (vd xem bảng tuần lịch sử). */
  wide?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  // Khoá cuộn nền khi modal/sheet mở (tránh nền trôi lung tung trên mobile).
  // Bù chiều rộng thanh cuộn để nội dung desktop không nhảy ngang.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement: html } = document;
    const scrollbar = window.innerWidth - html.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
    };
  }, [open]);

  /**
   * Đưa focus vào modal khi mở, giữ Tab quẩn bên trong, trả focus về chỗ cũ khi đóng.
   * Không có bẫy này thì Tab chạy ra nền phía sau overlay — người dùng bàn phím lạc
   * khỏi hộp thoại mà không có cách nào quay lại ngoài chuột.
   */
  useEffect(() => {
    if (!open) return;
    const box = boxRef.current;
    if (!box) return;
    const prev = document.activeElement as HTMLElement | null;
    // Focus vào chính khung (tabindex=-1), KHÔNG phải phần tử đầu tiên: tránh để
    // focus rơi sẵn vào nút ✕ hay một nút nguy hiểm ngay lúc modal vừa hiện.
    box.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === box)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    box.addEventListener('keydown', onKey);
    return () => {
      box.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  // Portal ra <body> để overlay (position: fixed) luôn phủ toàn viewport,
  // không bị "nhốt" trong .card (card có animation/overflow tạo containing-block).
  return createPortal(
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cls('modal', wide && 'wide')} ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-h">
          <div className="modal-h-row">
            <h3>{title}</h3>
            <IconButton onClick={onClose}>✕</IconButton>
          </div>
          {subheader}
        </div>
        <div className="modal-b">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
