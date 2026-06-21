import { useCallback, useState } from 'react';

/** Quản lý trạng thái đóng/mở (modal, panel…) một cách gọn gàng */
export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return { open, onOpen, onClose, toggle, setOpen };
}
