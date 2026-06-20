import { useEffect, type ReactNode } from 'react';

export function Spinner() {
  return <div className="spinner" />;
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
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
          <button className="btn-ico" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  );
}

/** Toast đơn giản, gắn trực tiếp vào DOM (không cần provider) */
export function toast(msg: string, icon = '✅') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${icon}</span>`;
  t.appendChild(document.createTextNode(msg));
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(12px)';
    setTimeout(() => t.remove(), 320);
  }, 2100);
}
