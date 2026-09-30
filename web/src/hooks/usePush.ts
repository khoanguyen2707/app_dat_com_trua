import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { registerServiceWorker } from '@/lib/sw';

/**
 * Trạng thái thông báo đẩy của THIẾT BỊ này.
 *
 * - `unsupported`: trình duyệt không có Service Worker / Push API.
 * - `ios-needs-install`: Safari trên iPhone chỉ cho đăng ký push khi app đã được
 *   "Thêm vào Màn hình chính". Tách riêng khỏi `unsupported` vì đây là việc user
 *   làm được, chỉ cần chỉ đúng cách — báo "không hỗ trợ" là sai và làm họ bỏ cuộc.
 * - `server-off`: máy chủ chưa cấu hình VAPID.
 * - `denied`: user đã chặn ở mức trình duyệt, nút bật sẽ không làm gì được nữa.
 */
export type PushState = 'loading' | 'unsupported' | 'ios-needs-install' | 'server-off' | 'denied' | 'off' | 'on';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS 13+ khai man là Mac; phân biệt bằng cảm ứng.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

/**
 * base64url của VAPID → ArrayBuffer mà PushManager yêu cầu.
 * Trả ArrayBuffer (không phải Uint8Array) vì kiểu BufferSource của lib DOM mới
 * không nhận Uint8Array<ArrayBufferLike>.
 */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

export function usePush() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const refresh = useCallback(async () => {
    if (!supported) {
      setState(isIOS() && !isStandalone() ? 'ios-needs-install' : 'unsupported');
      return;
    }
    try {
      const { enabled } = await api.vapidKey();
      if (!enabled) return setState('server-off');
      if (Notification.permission === 'denied') return setState('denied');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
    } catch {
      // Không biết chắc thì coi như chưa bật — user bấm bật sẽ thấy lỗi thật.
      setState('off');
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) {
      setState(isIOS() && !isStandalone() ? 'ios-needs-install' : 'unsupported');
      return;
    }
    // main.tsx đã đăng ký từ lúc app khởi động; ở đây chỉ chờ nó xong rồi đọc trạng thái.
    void registerServiceWorker().then((reg) => (reg ? refresh() : setState('unsupported')));
  }, [supported, refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const { enabled, publicKey } = await api.vapidKey();
      if (!enabled) {
        setState('server-off');
        throw new Error('Máy chủ chưa bật thông báo đẩy.');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        throw new Error('Bạn chưa cho phép hiện thông báo.');
      }
      await registerServiceWorker();
      const reg = await navigator.serviceWorker.ready;
      // Đã có subscription cũ thì dùng lại; đăng ký đè sẽ đổi endpoint và để lại rác.
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBuffer(publicKey),
        }));
      await api.pushSubscribe(sub.toJSON(), navigator.userAgent);
      setState('on');
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Gỡ ở server TRƯỚC: huỷ ở trình duyệt xong mới gọi thì mất endpoint, và
        // server sẽ còn giữ bản ghi chết cho tới lần gửi lỗi đầu tiên.
        await api.pushUnsubscribe(sub.endpoint).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState('off');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable, refresh };
}
