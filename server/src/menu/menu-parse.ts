/**
 * Bộ phân tích "thực đơn hôm nay" TẤT ĐỊNH (không cần AI) — tái dùng & test được.
 *
 * Nhiệm vụ: nhận text admin dán mỗi ngày (có thể thiếu dấu, lệch khoảng trắng,
 * lẫn emoji/bullet/giá) → tách thành danh sách món, khớp với danh mục hiện có để
 * biết món nào ĐÃ CÓ / món nào MỚI / món nào trong danh mục KHÔNG bán hôm nay (ẩn).
 *
 * Khoá khớp = bỏ dấu + bỏ HẾT khoảng trắng → "caphê đen" và "Cà phê đen" trùng nhau.
 * Cố ý KHÔNG gộp 2 món khác nhau (Mực rim ≠ Tôm rim); chỉ gợi ý "ngờ ngợ" khi gần giống.
 */

export type DishCat = 'MAIN' | 'DRINK';

export interface CatalogDish {
  id: string;
  name: string;
  category: DishCat;
  price: number;
}

export interface ParsedItem {
  raw: string; // dòng gốc
  name: string; // tên đã làm sạch (bỏ bullet/giá/đơn vị), giữ chữ gốc của admin
  key: string; // khoá khớp (bỏ dấu, bỏ khoảng trắng)
  price: number; // giá đọc được (đồ uống); món ăn để 0 -> dùng đơn giá tuần
  category: DishCat;
  match: 'existing' | 'new';
  dishId?: string; // có khi match === 'existing'
  maybeSameAs?: { id: string; name: string; score: number }; // new nhưng gần giống món có sẵn -> cảnh báo trùng
}

export interface MenuDiff {
  items: ParsedItem[]; // toàn bộ món trong text hôm nay (đã khử trùng lặp theo key)
  create: ParsedItem[]; // match === 'new'  -> sẽ tạo
  matched: ParsedItem[]; // match === 'existing' -> bán hôm nay
  hidden: CatalogDish[]; // có trong danh mục nhưng KHÔNG có hôm nay -> ẩn khỏi picker
}

const DRINK_PRICE_MAX = 20000; // < ngưỡng này + không phải món ăn -> coi là đồ uống

// Từ khoá đồ uống (đã bỏ dấu, bỏ khoảng trắng) — dùng để đoán category cho món MỚI.
const DRINK_KEYS = [
  'nuoc',
  'caphe',
  'cafe',
  'tra',
  'bacsiu',
  'bacsuu',
  'sinhto',
  'soda',
  'coca',
  'pepsi',
  'sting',
  '7up',
  'redbull',
  'bohuc',
  'yogurt',
  'sua',
];

// Đơn vị bám đuôi cần bỏ (đã bỏ dấu): "ly", "phần", "suất". CỐ Ý không thêm 'cái'/'tô'
// vì trùng âm với "cải"/"tô" trong tên món (vd "dưa cải", "đậu hủ").
const UNIT_WORDS = new Set(['ly', 'phan', 'suat']);

/** Bỏ dấu tiếng Việt + đ/Đ, về thường, gọn khoảng trắng. */
export function deburr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Khoá khớp: bỏ dấu + bỏ mọi ký tự không phải chữ/số (gồm khoảng trắng). */
export function matchKey(s: string): string {
  return deburr(s).replace(/[^a-z0-9]/g, '');
}

/** Đọc giá kiểu "10k", "12 k", "15.000", "10000" -> số tiền; 0 nếu không có. */
function extractPrice(line: string): number {
  const k = line.match(/(\d+)\s*k\b/i);
  if (k) return parseInt(k[1], 10) * 1000;
  const dotted = line.match(/(\d{1,3})[.,](\d{3})\b/);
  if (dotted) return parseInt(dotted[1] + dotted[2], 10);
  const plain = line.match(/\b(\d{4,6})\b/);
  if (plain) return parseInt(plain[1], 10);
  return 0;
}

/** Làm sạch 1 dòng thành tên món: bỏ emoji/bullet đầu dòng, bỏ token giá, bỏ đơn vị đuôi. */
function cleanName(line: string): string {
  let s = line
    // bỏ emoji ở bất kỳ đâu
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/gu, ' ')
    // bỏ token giá
    .replace(/\d+\s*k\b/gi, ' ')
    .replace(/\d{1,3}[.,]\d{3}\b/g, ' ')
    .replace(/\b\d{4,6}\b/g, ' ')
    // bỏ bullet/ký hiệu đầu dòng
    .replace(/^[-\s•*.+>)\]]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  // cắt dấu câu/khoảng trắng ở cuối TRƯỚC khi bỏ đơn vị (vd "... ly ." -> "... ly")
  s = s.replace(/[\s.,;:·•-]+$/u, '');
  // bỏ các đơn vị bám đuôi ("ly", "phần"...)
  let words = s.split(' ');
  while (words.length > 1 && UNIT_WORDS.has(deburr(words[words.length - 1]))) {
    words = words.slice(0, -1);
  }
  s = words
    .join(' ')
    .replace(/[\s.\-]+$/u, '')
    .trim();
  return s;
}

/** Khoảng cách Levenshtein (cho gợi ý "ngờ ngợ"). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

/** Độ giống 0..1 trên khoá khớp. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

const NEAR_THRESHOLD = 0.82; // >= ngưỡng này coi là "ngờ ngợ có thể trùng"

function guessCategory(key: string, price: number): DishCat {
  if (DRINK_KEYS.some((k) => key.includes(k))) return 'DRINK';
  if (price > 0 && price < DRINK_PRICE_MAX) return 'DRINK';
  return 'MAIN';
}

/**
 * Đoán biểu tượng (nhóm protein) theo TÊN món — làm emoji mặc định cho MÓN MỚI
 * để gom nhóm 🐟🍗🥩… cho đẹp. Chỉ là gợi ý, admin sửa lại được trong Thực đơn.
 */
export function guessEmoji(name: string, category: DishCat): string {
  const k = deburr(name);
  const first = k.split(' ')[0];
  if (category === 'DRINK') {
    if (/(ca phe|caphe|cafe|bac xiu|bac siu|bac suu)/.test(k)) return '☕';
    if (/(tra|sinh to|ep|cam|chanh|dua hau|sua chua)/.test(k)) return '🧋';
    return '🥛';
  }
  if (first === 'ca' || k.startsWith('cha ca')) return '🐟';
  if (/\b(tom|muc|nghieu|so|cua|ghe|hau|oc|bach tuoc)\b/.test(k)) return '🦐';
  if (/\b(suon|quay|chan gio|gio heo)\b/.test(k)) return '🍖';
  if (first === 'ga' || /\bga\b/.test(k)) return '🍗';
  if (/\b(thit|heo|bo|ba chi|nem|xa xiu|gio lua|lon|long)\b/.test(k)) return '🥩';
  if (/\btrung\b/.test(k)) return '🍳';
  if (/\b(rau|cai|bong cai|muop|bi|nam|su su|dau|bau|ngon)\b/.test(k)) return '🥬';
  return '🍲';
}

/**
 * Phân tích text thực đơn so với danh mục hiện có.
 * @param text  nội dung admin dán
 * @param catalog  danh sách Dish hiện có
 */
export function parseMenuText(text: string, catalog: CatalogDish[]): MenuDiff {
  const byKey = new Map<string, CatalogDish>();
  for (const d of catalog) byKey.set(matchKey(d.name), d);

  const items: ParsedItem[] = [];
  const seen = new Set<string>(); // khử trùng lặp trong chính text

  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim();
    if (!raw) continue;
    if (raw.endsWith(':')) continue; // dòng tiêu đề: "Thực đơn hôm nay:", "Đồ uống:"...
    const name = cleanName(raw);
    const key = matchKey(name);
    if (!key || key.length < 2) continue; // bỏ dòng tiêu đề rỗng/ký hiệu
    if (seen.has(key)) continue;
    seen.add(key);

    const price = extractPrice(raw);
    const hit = byKey.get(key);
    if (hit) {
      items.push({
        raw,
        name,
        key,
        price: hit.category === 'DRINK' ? price || hit.price : 0,
        category: hit.category,
        match: 'existing',
        dishId: hit.id,
      });
      continue;
    }
    // món mới: đoán category + tìm món gần giống để cảnh báo trùng
    const category = guessCategory(key, price);
    let best: { id: string; name: string; score: number } | undefined;
    for (const d of catalog) {
      const score = similarity(key, matchKey(d.name));
      if (score >= NEAR_THRESHOLD && (!best || score > best.score)) best = { id: d.id, name: d.name, score };
    }
    items.push({ raw, name, key, price: category === 'DRINK' ? price : 0, category, match: 'new', maybeSameAs: best });
  }

  const todayKeys = new Set(items.map((i) => i.key));
  const hidden = catalog.filter((d) => !todayKeys.has(matchKey(d.name)));

  return {
    items,
    create: items.filter((i) => i.match === 'new'),
    matched: items.filter((i) => i.match === 'existing'),
    hidden,
  };
}
