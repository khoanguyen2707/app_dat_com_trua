import type { Dish, Grid, PaymentConfig, User, Week } from './types';

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1';

let accessToken: string | null = localStorage.getItem('ct_access');
let refreshToken: string | null = localStorage.getItem('ct_refresh');

export function setTokens(a: string | null, r: string | null) {
  accessToken = a;
  refreshToken = r;
  if (a) localStorage.setItem('ct_access', a);
  else localStorage.removeItem('ct_access');
  if (r) localStorage.setItem('ct_refresh', r);
  else localStorage.removeItem('ct_refresh');
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
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
    throw new Error(msg || `Lỗi ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
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

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const api = {
  // auth
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, fullName: string) =>
    request<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, fullName }) }),
  me: () => request<User>('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  // weeks / grid
  activeGrid: () => request<Grid>('/weeks/active'),
  weekGrid: (id: string) => request<Grid>(`/weeks/${id}/grid`),
  weeks: () => request<Week[]>('/weeks'),
  createWeek: (label: string, unitPrice: number) =>
    request<Week>('/weeks', { method: 'POST', body: JSON.stringify({ label, unitPrice, isActive: true }) }),
  updateWeek: (id: string, data: Partial<Week>) =>
    request<Week>(`/weeks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWeek: (id: string) => request<{ message: string }>(`/weeks/${id}`, { method: 'DELETE' }),

  // orders
  setMyDays: (weekId: string, days: Record<string, boolean>) =>
    request('/orders/me', { method: 'PUT', body: JSON.stringify({ weekId, ...days }) }),
  setUserDays: (userId: string, weekId: string, days: Record<string, boolean>) =>
    request(`/orders/${userId}`, { method: 'PUT', body: JSON.stringify({ weekId, ...days }) }),
  setPaid: (weekId: string, userId: string, paid: boolean) =>
    request('/orders/paid', { method: 'PATCH', body: JSON.stringify({ weekId, userId, paid }) }),

  // dishes
  dishes: () => request<Dish[]>('/dishes'),
  createDish: (d: Partial<Dish>) => request<Dish>('/dishes', { method: 'POST', body: JSON.stringify(d) }),
  updateDish: (id: string, d: Partial<Dish>) =>
    request<Dish>(`/dishes/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  deleteDish: (id: string) => request<{ message: string }>(`/dishes/${id}`, { method: 'DELETE' }),

  // payment
  payment: () => request<PaymentConfig>('/payment'),
  updatePayment: (p: Partial<PaymentConfig>) =>
    request<PaymentConfig>('/payment', { method: 'PATCH', body: JSON.stringify(p) }),

  // users
  users: () => request<User[]>('/users'),
  updateUser: (id: string, data: Partial<User>) =>
    request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
};
