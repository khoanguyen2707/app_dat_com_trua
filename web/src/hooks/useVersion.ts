import { useEffect, useState } from 'react';

/** Bản của web — nhúng lúc build. */
export const WEB_VERSION = __APP_VERSION__;
export const WEB_COMMIT = __APP_COMMIT__;
export const WEB_BUILT_AT = __APP_BUILT_AT__;

type ApiHealth = { version?: string; commit?: string; startedAt?: string };

/**
 * Bản của web và bản của API.
 *
 * Hỏi cả hai vì chúng deploy riêng: đã có lần API còn chạy code cũ trong khi web
 * đã mới, và triệu chứng duy nhất là một endpoint trả 404 không ai hiểu vì sao.
 * Lệch version thì nói thẳng ra thay vì để người dùng tự đoán.
 */
export function useVersion() {
  const [api, setApi] = useState<ApiHealth | null>(null);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ?? '';
    fetch(base + '/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setApi(d))
      .catch(() => setApi(null)); // API ngủ/không với tới được -> im, không phải lỗi của người dùng
  }, []);

  return {
    web: WEB_VERSION,
    commit: WEB_COMMIT,
    builtAt: WEB_BUILT_AT,
    api: api?.version ?? null,
    /** Hai bên khác bản = một trong hai chưa deploy xong. */
    mismatch: !!api?.version && api.version !== WEB_VERSION,
  };
}
