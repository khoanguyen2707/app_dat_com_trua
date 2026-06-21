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

// [tên, mô tả, emoji, giá]
const DISHES: Array<[string, string, string, number]> = [
  // Món cơm — đồng giá 25.000đ (mix nhiều món trong 1 suất vẫn 25.000đ)
  ['Cá lóc kho', '', '🐟', 25000],
  ['Cá dìa kho', '', '🐟', 25000],
  ['Cá nục kho sốt cà', '', '🐟', 25000],
  ['Cá hố khô chiên mắm', '', '🐟', 25000],
  ['Cá ồ chiên', '', '🐟', 25000],
  ['Gà chiên mắm', '', '🍗', 25000],
  ['Gà kho sả', '', '🍗', 25000],
  ['Thịt kho trứng cút', '', '🥩', 25000],
  ['Thịt kho đậu hủ', '', '🥩', 25000],
  ['Thịt kho mắm ruốc', '', '🥩', 25000],
  ['Thịt kho dưa cải', '', '🥩', 25000],
  ['Sườn non kho', '', '🍖', 25000],
  ['Tai heo mắm nêm', '', '🥩', 25000],
  ['Heo quay', '', '🍖', 25000],
  ['Bông cải xào thịt heo', '', '🥬', 25000],
  ['Đậu hủ nhồi thịt', '', '🍲', 25000],
  ['Chả cá kho', '', '🐟', 25000],
  ['Mắm chưng', '', '🍲', 25000],
  ['Tôm rim', '', '🦐', 25000],
  ['Trứng chiên', '', '🍳', 25000],
  // Đồ uống — tính tiền riêng theo giá từng loại
  ['Nước đậu', 'Đồ uống', '🥛', 10000],
  ['Cà phê đen', 'Đồ uống', '☕', 10000],
  ['Cà phê sữa', 'Đồ uống', '☕', 12000],
  ['Cà phê muối', 'Đồ uống', '☕', 15000],
  ['Bạc sửu', 'Đồ uống', '☕', 15000],
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
    await this.seedDishes(); // thực đơn: luôn seed khi DB chưa có món (không phụ thuộc SEED_DEMO)
    if ((this.config.get<string>('SEED_DEMO') ?? 'true') === 'true') {
      await this.seedDemo();
    }
  }

  /** Seed thực đơn mặc định nếu DB chưa có món nào (idempotent — không đụng dữ liệu admin đã sửa). */
  private async seedDishes() {
    const count = await this.prisma.dish.count();
    if (count > 0) {
      return; // đã có món -> bỏ qua
    }
    for (const [name, description, emoji, price] of DISHES) {
      await this.prisma.dish.create({ data: { name, description: description || null, emoji, price } });
    }
    this.logger.log(`Seeded ${DISHES.length} dishes (thực đơn mặc định)`);
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
