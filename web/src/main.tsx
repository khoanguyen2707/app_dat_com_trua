import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import { AuthProvider } from '@/context/AuthProvider';
import './styles.css';
import './theme.css'; // sau styles.css: utility Tailwind thắng CSS cũ trong lúc migrate

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
