import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cls } from '@/lib/format';
import { IconButton } from './IconButton';

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Modal rộng (vd xem bảng tuần lịch sử). */
  wide?: boolean;
}) {
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

  if (!open) return null;
  // Portal ra <body> để overlay (position: fixed) luôn phủ toàn viewport,
  // không bị "nhốt" trong .card (card có animation/overflow tạo containing-block).
  return createPortal(
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cls('modal', wide && 'wide')}>
        <div className="modal-h">
          <h3>{title}</h3>
          <IconButton onClick={onClose}>✕</IconButton>
        </div>
        <div className="modal-b">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
