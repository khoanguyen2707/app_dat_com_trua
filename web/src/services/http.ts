import { API_PREFIX, STORAGE } from '@/constants/config';
import { t } from '@/constants/strings';

const BASE = (import.meta.env.VITE_API_URL ?? '') + API_PREFIX;

let accessToken: string | null = localStorage.getItem(STORAGE.access);
let refreshToken: string | null = localStorage.getItem(STORAGE.refresh);

/** Lưu / xoá cặp token (đồng bộ localStorage) */
export function setTokens(a: string | null, r: string | null) {
  accessToken = a;
  refreshToken = r;
  if (a) localStorage.setItem(STORAGE.access, a);
  else localStorage.removeItem(STORAGE.access);
  if (r) localStorage.setItem(STORAGE.refresh, r);
  else localStorage.removeItem(STORAGE.refresh);
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/** Gọi API có gắn Bearer token, tự refresh khi gặp 401 và chuẩn hoá lỗi */
export async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(BASE + path, { ...options, headers });

  if (res.status === 401 && retry && refreshToken) {
    const ok = await tryRefresh();
    if (ok) return request<T>(path, options, false);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.map((m: any) => m.message ?? m).join(', ') : body.message;
    throw new Error(msg || t.errors.status(res.status));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
