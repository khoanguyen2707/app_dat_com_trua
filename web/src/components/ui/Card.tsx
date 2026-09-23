import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mb-4 overflow-hidden rounded-ui-lg border border-line bg-surface shadow-card', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Tiêu đề card: icon + tiêu đề, phần `action` (nếu có) được đẩy sang phải */
export function CardHeader({ icon, title, action }: { icon?: ReactNode; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
      {icon && <span className="grid size-6 place-items-center text-ink-3 [&_svg]:size-4">{icon}</span>}
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

export function CardBody({ flush, className, children, ...rest }: HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  return (
    <div className={cn(flush ? 'p-0' : 'p-5', className)} {...rest}>
      {children}
    </div>
  );
}
