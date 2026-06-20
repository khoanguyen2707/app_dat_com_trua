import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const SELECT = { id: true, email: true, fullName: true, role: true, active: true, color: true, createdAt: true };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: SELECT, orderBy: { createdAt: 'asc' } });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensure(id);
    return this.prisma.user.update({ where: { id }, data: dto, select: SELECT });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Đã xoá thành viên' };
  }

  private async ensure(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }
  }
}
