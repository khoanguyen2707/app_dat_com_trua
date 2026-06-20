import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateDishDto, UpdateDishDto } from './dto/dish.dto';

@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.dish.findMany({ orderBy: { createdAt: 'asc' } });
  }

  create(dto: CreateDishDto) {
    return this.prisma.dish.create({ data: dto });
  }

  async update(id: string, dto: UpdateDishDto) {
    await this.ensure(id);
    return this.prisma.dish.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.dish.delete({ where: { id } });
    return { message: 'Đã xoá món' };
  }

  private async ensure(id: string) {
    const d = await this.prisma.dish.findUnique({ where: { id } });
    if (!d) {
      throw new NotFoundException('Không tìm thấy món');
    }
  }
}
