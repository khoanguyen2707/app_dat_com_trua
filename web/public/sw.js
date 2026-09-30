/*
 * Service worker — CHỈ để nhận thông báo đẩy.
 *
 * Cố ý không cache gì: app đọc dữ liệu sống (thực đơn, đơn, công nợ) nên cache chỉ
 * đẻ ra lớp lỗi "thấy bản cũ sau khi deploy" mà không đổi lại được gì. Muốn offline
 * thì phải thiết kế riêng, không phải thêm vài dòng ở đây.
 */

// Nhận quyền điều khiển ngay, khỏi chờ tab cũ đóng — bản sw mới luôn là bản đang chạy.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Payload lạ (hoặc rỗng): vẫn hiện một thông báo chung còn hơn im lặng.
    data = { body: event.data && event.data.text ? event.data.text() : '' };
  }

  const title = data.title || 'Đặt Cơm Trưa';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // Cùng tag thì thay thế nhau, không đọng nhiều bản giống hệt trên máy.
      tag: data.tag || 'com-trua',
      renotify: !!data.tag,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // App đang mở ở đâu đó thì đưa tab đó lên và điều hướng, thay vì mở tab thứ hai.
      for (const client of all) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
