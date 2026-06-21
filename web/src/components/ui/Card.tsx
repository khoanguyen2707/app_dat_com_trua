import type { HTMLAttributes, ReactNode } from 'react';
import { cls } from '@/lib/format';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cls('card', className)} {...rest}>
      {children}
    </div>
  );
}

/** Tiêu đề card: icon + tiêu đề, phần `action` (nếu có) được đẩy sang phải */
export function CardHeader({ icon, title, action }: { icon: ReactNode; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-h">
      <div className="ic">{icon}</div>
      <h2>{title}</h2>
      {action && (
        <>
          <div className="spacer" />
          {action}
        </>
      )}
    </div>
  );
}

export function CardBody({ flush, className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  return (
    <div className={cls('card-b', flush && 'flush', className)} {...rest}>
      {children}
    </div>
  );
}
