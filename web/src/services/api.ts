import type { AuthResult, DayDetail, DayKey, Dish, Grid, PaymentConfig, User, Week } from '@/types';
import { request } from './http';

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
  createWeek: (label: string, unitPrice: number, startDate?: string) =>
    request<Week>('/weeks', {
      method: 'POST',
      body: JSON.stringify({ label, unitPrice, isActive: true, ...(startDate ? { startDate } : {}) }),
    }),
  updateWeek: (id: string, data: Partial<Week>) =>
    request<Week>(`/weeks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteWeek: (id: string) => request<{ message: string }>(`/weeks/${id}`, { method: 'DELETE' }),

  // orders
  setMyDays: (weekId: string, days: Record<string, boolean>) =>
    request('/orders/me', { method: 'PUT', body: JSON.stringify({ weekId, ...days }) }),
  setUserDays: (userId: string, weekId: string, days: Record<string, boolean>) =>
    request(`/orders/${userId}`, { method: 'PUT', body: JSON.stringify({ weekId, ...days }) }),
  // chi tiết 1 ngày: ăn cơm + mix món + đồ uống
  setMyDay: (weekId: string, day: DayKey, detail: DayDetail) =>
    request('/orders/me/day', { method: 'PUT', body: JSON.stringify({ weekId, day, ...detail }) }),
  setUserDay: (userId: string, weekId: string, day: DayKey, detail: DayDetail) =>
    request(`/orders/${userId}/day`, { method: 'PUT', body: JSON.stringify({ weekId, day, ...detail }) }),
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
