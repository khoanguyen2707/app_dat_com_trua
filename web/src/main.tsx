import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import { AuthProvider } from '@/context/AuthProvider';
import { registerServiceWorker } from '@/lib/sw';
import './theme.css';

// Đăng ký ngay khi app khởi động, không đợi ai mở màn cài đặt: thông báo đẩy chỉ tới
// được máy khi service worker đã đăng ký, và công tắc bật/tắt nằm trong dropdown chuông
// nên nếu chờ nó mount thì thiết bị mới sẽ không bao giờ nhận được gì.
void registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
