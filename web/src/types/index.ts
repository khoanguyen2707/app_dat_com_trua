export type Role = 'ADMIN' | 'USER';
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DishCategory = 'MAIN' | 'DRINK';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  color?: string | null;
  active?: boolean;
}

export interface Dish {
  id: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  price: number;
  category: DishCategory;
}

/** Đồ uống đã chọn: dishId + số lượng */
export interface DrinkItem {
  dishId: string;
  qty: number;
}

/** Món & đồ uống của 1 ngày (food = dishId các món ăn, drinks = đồ uống + số lượng) */
export interface DayItems {
  food: string[];
  drinks: DrinkItem[];
}

/** Payload đặt chi tiết 1 ngày */
export interface DayDetail {
  eat: boolean;
  food: string[];
  drinks: DrinkItem[];
}

export interface Week {
  id: string;
  label: string;
  startDate?: string | null;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  servings?: number;
  foodTotal?: number;
  drinksTotal?: number;
  total?: number;
  memberCount?: number;
}

export interface GridMember {
  userId: string;
  fullName: string;
  color?: string | null;
  role: Role;
  days: Record<DayKey, boolean>;
  items?: Record<DayKey, DayItems>;
  servings: number;
  foodTotal?: number;
  drinksTotal?: number;
  total: number;
  paid: boolean;
}

export interface Grid {
  week: Week;
  members: GridMember[];
  totals: {
    perDay: Record<DayKey, number>;
    totalServings: number;
    totalFood?: number;
    totalDrinks?: number;
    totalMoney: number;
  };
  /** Ngày bị khoá với user thường (đã qua, hoặc hôm nay đã quá giờ chốt). */
  lockedDays?: Record<DayKey, boolean>;
  /** Nhãn ngày dương lịch "d/M" cho mỗi cột. */
  dates?: Record<DayKey, string | null>;
  /** Giờ chốt đặt cơm trong ngày. */
  cutoff?: { minutes: number; label: string };
}

export interface PaymentConfig {
  groupName: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountHolder: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}
