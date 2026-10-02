/**
 * Vì sao một ngày bị khoá với user thường.
 *
 * 'sent' = admin đã gửi đơn cho quán, 'deadline' = quá giờ quán đóng mà chưa ai bấm.
 */
export type LockReason = 'past' | 'future' | 'sent' | 'deadline';

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
  /** Món "luôn có": tự xuất hiện trong thực đơn mọi ngày admin đã đăng. */
  pinned?: boolean;
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
  /** Tối đa 3 món có sẵn gần giống (cùng loại). */
  candidates?: { id: string; name: string; score: number }[];
}

/** Kết quả so text thực đơn với danh mục: tạo mới / đã có / ẩn hôm nay. */
export interface MenuDiff {
  items: MenuParsedItem[];
  create: MenuParsedItem[];
  matched: MenuParsedItem[];
  hidden: { id: string; name: string; category: DishCategory; price: number }[];
  /** Nhóm món mới gần giống nhau trong cùng lần dán (theo key). */
  groups?: string[][];
}

/** Một cụm món nghi trùng trong danh mục. */
export interface DishDuplicateGroup {
  category: DishCategory;
  dishes: (Dish & { orderCount: number; lastOrderedAt: string | null })[];
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
  /** Ngày bị khoá với user thường (đã qua/chưa tới, hoặc hôm nay đơn đã sang quán). */
  lockedDays?: Record<DayKey, boolean>;
  /** Vì sao từng ngày bị khoá; null = còn sửa được. */
  lockReasons?: Record<DayKey, LockReason | null>;
  /** Đơn cơm hôm nay đã gửi cho quán chưa — thứ quyết định khoá cột hôm nay. */
  dispatchSent?: boolean;
  /** Cột nào của tuần này là hôm nay (lịch VN); null khi xem tuần khác. */
  todayKey?: DayKey | null;
  /** Nhãn ngày dương lịch "d/M" cho mỗi cột. */
  dates?: Record<DayKey, string | null>;
  /** Giờ chốt đặt cơm trong ngày (mốc nhắc, không còn là mốc khoá). */
  cutoff?: { minutes: number; label: string };
  /** Giờ quán ngừng nhận đơn — lưới an toàn khi hôm đó không ai bấm "đã gửi". */
  shopDeadline?: { minutes: number; label: string };
  /**
   * Thực đơn user thực sự thấy = dayMenu của admin + các món ghim.
   * Dùng cái này cho picker; `week.dayMenu` là lựa chọn thô của admin (màn đăng thực đơn).
   */
  effectiveDayMenu?: Record<string, string[]> | null;
}

/** Trạng thái gửi đơn cơm cho quán trong ngày. */
export interface DispatchStatus {
  date: string;
  sent: boolean;
  sentAt: string | null;
  sentBy: string | null;
  servings: number;
  cutoff: string;
  shopDeadline: string;
  minutesLeft: number;
}

export interface PaymentConfig {
  groupName: string;
  bankName: string;
  bankBin: string;
  accountNumber: string;
  accountHolder: string;
  /** Nợ vượt ngưỡng này (đồng) thì khoá đặt cơm. 0 = tắt rule. */
  debtLimit?: number;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** Một tuần còn nợ (chưa được admin xác nhận) của 1 người. */
export interface DebtWeek {
  weekId: string;
  weekLabel: string;
  unitPrice: number;
  days: Record<DayKey, boolean>;
  servings: number;
  foodTotal: number;
  drinks: { name: string; qty: number; price: number }[];
  drinksTotal: number;
  total: number;
  status: Exclude<PaymentStatus, 'PAID'>;
  reportedAt: string | null;
}

/** Tổng công nợ của 1 người trên mọi tuần. */
export interface Debtor {
  userId: string;
  fullName: string;
  weeks: DebtWeek[];
  total: number;
  pendingTotal: number;
}

/** GET /debts/me — công nợ của tôi kèm trạng thái khoá đặt cơm. */
export interface MyDebts extends Debtor {
  /** Nợ đã bỏ tuần đang chạy — con số dùng để so với ngưỡng. */
  outstanding: number;
  /** Ngưỡng đang áp dụng; 0 = rule đang tắt. */
  debtLimit: number;
  /** true = không được bật thêm ngày ăn / thêm món cho tới khi admin xác nhận thanh toán. */
  locked: boolean;
}

/** GET /stats/my-top-dishes — món tôi hay đặt 90 ngày gần nhất. */
export interface MyTopDish {
  dishId: string;
  count: number;
}

/** GET /stats/me — thống kê của tôi trong một tháng. */
export interface MyStats {
  /** Nhãn tháng "MM/YYYY". */
  month: string;
  servings: number;
  foodTotal: number;
  drinksTotal: number;
  total: number;
  /** Số ngày có thực đơn đã diễn ra trong tháng — mẫu số của attendanceRate. */
  menuDays: number;
  /** 0..1 */
  attendanceRate: number;
  pickups: number;
  /** Nợ trên MỌI tuần chưa xác nhận, không giới hạn trong tháng đang xem. */
  outstanding: number;
  topDishes: { dishId: string; name: string; emoji: string | null; count: number }[];
}

/** Một dòng breakdown món trong bảng hôm nay. */
export interface TodayLine {
  dishId: string;
  name: string;
  emoji: string | null;
  qty: number;
}

/** GET /stats/today — bảng điều hành hôm nay của admin. */
export interface TodayBoard {
  date: string;
  dayKey: DayKey;
  weekId: string;
  unitPrice: number;
  menuPosted: boolean;
  menuCount: number;
  /** Số hộp cơm = số NGƯỜI ăn (mix nhiều món vẫn một hộp). */
  servings: number;
  totalMoney: number;
  mains: TodayLine[];
  drinks: TodayLine[];
  notes: { fullName: string; dishes: string[]; note: string }[];
  dispatch: { sent: boolean; sentAt: string | null; sentBy: string | null };
  pickup: { userId: string; fullName: string } | null;
  cutoff: string;
  shopDeadline: string;
  /** Số phút còn lại tới lúc quán ngừng nhận đơn. */
  minutesLeft: number;
  /** Ai ăn gì — gồm cả người chỉ gọi nước. */
  people: {
    userId: string;
    fullName: string;
    eat: boolean;
    dishes: string[];
    drinks: string[];
    note: string;
  }[];
  /** Text đã định dạng sẵn để dán cho quán. */
  orderText: string;
}
