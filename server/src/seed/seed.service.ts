import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@/common/enums/role.enum';

type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

const MEMBERS: Array<[string, string, Day[]]> = [
  ['Chương', 'chuong', ['mon', 'tue', 'wed', 'thu', 'fri']],
  ['Bông', 'bong', []],
  ['Nghĩa', 'nghia', ['mon']],
  ['Hoàng', 'hoang', ['mon', 'tue', 'wed', 'thu']],
  ['Mạnh', 'manh', ['mon', 'tue', 'thu', 'fri']],
  ['Thuận', 'thuan', ['mon', 'tue', 'wed', 'thu', 'fri']],
  ['Nhân', 'nhan', []],
  ['Điềm', 'diem', []],
  ['Nghiệp', 'nghiep', ['mon', 'wed', 'fri']],
  ['Đạt', 'dat', ['mon', 'tue', 'wed', 'thu']],
  ['Phát', 'phat', ['mon', 'tue', 'wed', 'thu']],
  ['Khoa', 'khoa', ['wed', 'thu']],
  ['Đệ', 'de', ['mon']],
];

type DishSeed = { name: string; emoji: string; price: number; category: 'MAIN' | 'DRINK' };

const MAIN_PRICE = 25000;
const DISHES: DishSeed[] = [
  // Món ăn — đồng giá 25.000đ (mix nhiều món trong 1 suất vẫn 25.000đ)
  { name: 'Cá lóc kho', emoji: '🐟', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Cá dìa kho', emoji: '🐟', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Cá nục kho sốt cà', emoji: '🐟', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Cá hố khô chiên mắm', emoji: '🐟', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Cá ồ chiên', emoji: '🐟', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Gà chiên mắm', emoji: '🍗', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Gà kho sả', emoji: '🍗', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Thịt kho trứng cút', emoji: '🥩', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Thịt kho đậu hủ', emoji: '🥩', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Thịt kho mắm ruốc', emoji: '🥩', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Thịt kho dưa cải', emoji: '🥩', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Sườn non kho', emoji: '🍖', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Tai heo mắm nêm', emoji: '🥩', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Heo quay', emoji: '🍖', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Bông cải xào thịt heo', emoji: '🥬', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Đậu hủ nhồi thịt', emoji: '🍲', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Chả cá kho', emoji: '🐟', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Mắm chưng', emoji: '🍲', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Tôm rim', emoji: '🦐', price: MAIN_PRICE, category: 'MAIN' },
  { name: 'Trứng chiên', emoji: '🍳', price: MAIN_PRICE, category: 'MAIN' },
  // Đồ uống — tính tiền riêng theo giá từng loại
  { name: 'Nước đậu', emoji: '🥛', price: 10000, category: 'DRINK' },
  { name: 'Cà phê đen', emoji: '☕', price: 10000, category: 'DRINK' },
  { name: 'Cà phê sữa', emoji: '☕', price: 12000, category: 'DRINK' },
  { name: 'Cà phê muối', emoji: '☕', price: 15000, category: 'DRINK' },
  { name: 'Bạc sửu', emoji: '☕', price: 15000, category: 'DRINK' },
];

const PALETTE = ['#ff6b35', '#0a84ff', '#22c55e', '#7c5cff', '#ff9f0a', '#ff3b30', '#06b6d4', '#ec4899', '#8b5cf6'];

@Injectable()
export class SeedService {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async run() {
    await this.seedPayment();
    await this.seedAdmin();
    await this.seedDishes(); // thực đơn: backfill món chuẩn còn thiếu mỗi lần khởi động (không phụ thuộc SEED_DEMO)
    if ((this.config.get<string>('SEED_DEMO') ?? 'true') === 'true') {
      await this.seedDemo();
    }
  }

  /**
   * Đảm bảo thực đơn chuẩn luôn có mặt: thêm món nào còn THIẾU (so theo name),
   * KHÔNG đụng món admin đã tự thêm/sửa và KHÔNG tạo trùng. Idempotent & tự đồng
   * bộ mỗi lần deploy (khắc phục DB production cũ thiếu món/đồ uống mới).
   */
  private async seedDishes() {
    const existing = await this.prisma.dish.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map((d) => d.name));
    const missing = DISHES.filter((d) => !existingNames.has(d.name));
    if (missing.length === 0) {
      return; // menu chuẩn đã đủ -> bỏ qua
    }
    for (const d of missing) {
      await this.prisma.dish.create({
        data: { name: d.name, emoji: d.emoji, price: d.price, category: d.category },
      });
    }
    this.logger.log(`Backfill ${missing.length}/${DISHES.length} món còn thiếu vào thực đơn`);
  }

  private async seedPayment() {
    const exists = await this.prisma.paymentConfig.findUnique({ where: { id: 'default' } });
    if (!exists) {
      await this.prisma.paymentConfig.create({ data: { id: 'default' } });
      this.logger.log('Created default payment config');
    }
  }

  private async seedAdmin() {
    const email = (this.config.get<string>('ADMIN_EMAIL') ?? 'admin@comtrua.vn').toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (!exists) {
      const password = this.config.get<string>('ADMIN_PASSWORD') ?? 'admin123';
      await this.prisma.user.create({
        data: {
          email,
          password: await bcrypt.hash(password, 10),
          fullName: 'Quản trị',
          role: Role.ADMIN,
          active: true,
          color: '#16181d',
        },
      });
      this.logger.log(`Created admin: ${email}`);
    }
  }

  private async seedDemo() {
    const weekCount = await this.prisma.week.count();
    if (weekCount > 0) {
      return; // đã seed
    }
    this.logger.log('Seeding demo data (members, week)...');

    const week = await this.prisma.week.create({
      data: {
        label: '15/6/2026 - 20/6/2026',
        startDate: new Date(Date.UTC(2026, 5, 15)), // Thứ 2, 15/6/2026
        unitPrice: 25000,
        isActive: true,
      },
    });

    const defaultPassword = this.config.get<string>('DEFAULT_PASSWORD') ?? '123456';
    const hash = await bcrypt.hash(defaultPassword, 10);

    for (let i = 0; i < MEMBERS.length; i++) {
      const [fullName, slug, days] = MEMBERS[i];
      const email = `${slug}@comtrua.vn`;
      const user = await this.prisma.user.create({
        data: { email, password: hash, fullName, role: Role.USER, active: true, color: PALETTE[i % PALETTE.length] },
      });
      await this.prisma.order.create({
        data: {
          weekId: week.id,
          userId: user.id,
          mon: days.includes('mon'),
          tue: days.includes('tue'),
          wed: days.includes('wed'),
          thu: days.includes('thu'),
          fri: days.includes('fri'),
          sat: days.includes('sat'),
          sun: days.includes('sun'),
        },
      });
    }
    this.logger.log(`Seeded ${MEMBERS.length} members. Default password: ${defaultPassword}`);
  }
}
