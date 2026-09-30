/**
 * Đăng ký service worker cho thông báo đẩy.
 *
 * Tách khỏi `usePush` để việc đăng ký không phụ thuộc component nào được mount: công
 * tắc bật/tắt nằm trong dropdown chuông, mà dropdown chỉ render khi người dùng bấm vào.
 *
 * Trả về registration, hoặc null khi trình duyệt không hỗ trợ / đăng ký hỏng — nơi gọi
 * không bao giờ phải bắt lỗi, và app chạy bình thường khi không có push.
 */
let pending: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  pending ??= navigator.serviceWorker.register('/sw.js').catch(() => null);
  return pending;
}
