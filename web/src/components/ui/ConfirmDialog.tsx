import { useState } from 'react';
import { t } from '@/constants/strings';
import { Button } from './Button';
import { Modal } from './Modal';

export type ConfirmOptions = {
  title: string;
  /** Nội dung; xuống dòng bằng '\n' được giữ nguyên khi hiển thị. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Thao tác phá huỷ → nút xác nhận màu đỏ. */
  danger?: boolean;
};

/** Ruột của hộp thoại xác nhận. Bình thường gọi qua `confirmDialog()` chứ không dùng trực tiếp. */
export function ConfirmDialog({ opts, done }: { opts: ConfirmOptions; done: (ok: boolean) => void }) {
  const [open, setOpen] = useState(true);
  const close = (ok: boolean) => {
    setOpen(false);
    done(ok);
  };

  return (
    <Modal open={open} title={opts.title} onClose={() => close(false)}>
      <div className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{opts.message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={() => close(false)}>{opts.cancelLabel ?? t.actions.cancel}</Button>
        <Button variant={opts.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
          {opts.confirmLabel ?? t.actions.confirm}
        </Button>
      </div>
    </Modal>
  );
}
