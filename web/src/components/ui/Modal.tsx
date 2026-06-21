import { useEffect, type ReactNode } from 'react';
import { IconButton } from './IconButton';

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h">
          <h3>{title}</h3>
          <IconButton onClick={onClose}>✕</IconButton>
        </div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  );
}
