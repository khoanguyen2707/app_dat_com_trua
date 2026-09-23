export type Role = 'ADMIN' | 'USER';
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DishCategory = 'MAIN' | 'DRINK';
export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  weekId?: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: AppNotification[];
  unread: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  color?: string | null;
  active?: boolean;
  /** Email/Object ID Microsoft 365 để @mention trong Teams khi tới lượt đi lấy cơm. */
  teamsEmail?: string | null;
  /** true = miễn đi lấy cơm (không bao giờ bị bốc trong xoay tua). */
  pickupOptOut?: boolean;
}

/** Số liệu xoay tua lấy cơm của 1 thành viên (GET /pickup/stats — admin). */
export interface PickupStat {
  userId: string;
  fullName: string;
  email: string;
  pickupOptOut: boolean;
  /** Tổng số NGÀY đã đặt cơm (chỉ tính ngày đã diễn ra). */
  orderCount: number;
  /** Tổng số lượt đã đi lấy cơm. */
  pickupCount: number;
  lastPickup: string | null;
  /** Tỷ lệ thô đi/đặt — null khi chưa đặt lần nào. */
  rawRate: number | null;
  /** Tỷ lệ đã làm mượt — con số thuật toán thực sự dùng để xếp lượt. */
  rate: number;
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
  /** Ghi chú cho người đi mua, vd "ít cơm". Chuỗi rỗng = xoá ghi chú của ngày đó. */
  note?: string;
}

export interface Week {
  id: string;
  label: string;
  startDate?: string | null;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  /** Thực đơn bán theo ngày: { mon: [dishId, ...], ... }. Ngày có list → picker chỉ hiện món đó. */
  dayMenu?: Record<string, string[]> | null;
  servings?: number;
  foodTotal?: number;
  drinksTotal?: number;
  total?: number;
  memberCount?: number;
}

/** 1 dòng trong kết quả phân tích "thực đơn hôm nay". */
export interface MenuParsedItem {
  raw: string;
  name: string;
  key: string;
  price: number;
  category: DishCategory;
  match: 'existing' | 'new';
  dishId?: string;
  maybeSameAs?: { id: string; name: string; score: number } | null;
}

/** Kết quả so text thực đơn với danh mục: tạo mới / đã có / ẩn hôm nay. */
export interface MenuDiff {
  items: MenuParsedItem[];
  create: MenuParsedItem[];
  matched: MenuParsedItem[];
  hidden: { id: string; name: string; category: DishCategory; price: number }[];
}

/** Trạng thái bắn webhook Power Automate: đã gửi / bỏ qua (tắt hoặc chưa cấu hình) / lỗi. */
export interface WebhookResult {
  status: 'sent' | 'skipped' | 'failed';
  httpStatus?: number;
  error?: string;
}

/** Kết quả áp dụng thực đơn 1 ngày (kèm trạng thái thông báo Teams). */
export interface MenuApplyResult {
  weekId: string;
  day: DayKey;
  availableIds: string[];
  createdCount: number;
  dayMenu: Record<string, string[]>;
  webhook: WebhookResult;
}

export interface GridMember {
  userId: string;
  fullName: string;
  color?: string | null;
  role: Role;
  days: Record<DayKey, boolean>;
  items?: Record<DayKey, DayItems>;
  /** Ghi chú theo ngày; ngày không ghi thì không có khoá. */
  notes?: Partial<Record<DayKey, string>>;
  servings: number;
  foodTotal?: number;
  drinksTotal?: number;
  total: number;
  paid: boolean;
  paymentStatus: PaymentStatus;
  reportedAt?: string | null;
  paidAt?: string | null;
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
  /** Cột nào của tuần này là hôm nay (lịch VN); null khi xem tuần khác. */
  todayKey?: DayKey | null;
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
