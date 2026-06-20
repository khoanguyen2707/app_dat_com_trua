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

const DISHES: Array<[string, string, string, number]> = [
  ['Cơm gà xối mỡ', 'Gà giòn, cơm thơm', '🍗', 25000],
  ['Cơm sườn nướng', 'Sườn nướng mật ong', '🍖', 25000],
  ['Cơm bò lúc lắc', 'Bò mềm, rau củ', '🥩', 30000],
  ['Cơm cá kho tộ', 'Cá kho đậm đà', '🐟', 25000],
  ['Cơm chay thập cẩm', 'Đậu hũ, rau củ', '🥗', 20000],
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
    if ((this.config.get<string>('SEED_DEMO') ?? 'true') === 'true') {
      await this.seedDemo();
    }
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
    this.logger.log('Seeding demo data (dishes, members, week)...');

    for (const [name, description, emoji, price] of DISHES) {
      await this.prisma.dish.create({ data: { name, description, emoji, price } });
    }

    const week = await this.prisma.week.create({
      data: { label: '15/6/2026 - 20/6/2026', unitPrice: 25000, isActive: true },
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
