import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.paymentConfig.findUnique({ where: { id: 'default' } });
    if (existing) {
      return existing;
    }
    return this.prisma.paymentConfig.create({ data: { id: 'default' } });
  }

  async update(dto: UpdatePaymentDto) {
    return this.prisma.paymentConfig.upsert({
      where: { id: 'default' },
      update: dto,
      create: { id: 'default', ...dto },
    });
  }
}
