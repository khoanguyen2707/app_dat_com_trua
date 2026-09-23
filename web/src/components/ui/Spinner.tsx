import { Loader2 } from 'lucide-react';

export function Spinner() {
  return (
    <div className="grid place-items-center py-16" role="status" aria-label="Đang tải">
      <Loader2 className="size-6 animate-spin text-ink-4" />
    </div>
  );
}
