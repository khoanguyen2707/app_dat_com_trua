import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@/common/enums/role.enum';
import { UpdateUserDto } from './dto/update-user.dto';

const SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  active: true,
  color: true,
  teamsEmail: true,
  pickupOptOut: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: SELECT, orderBy: { createdAt: 'asc' } });
  }

  async update(id: string, dto: UpdateUserDto) {
    const target = await this.ensure(id);
    // Hạ quyền hay khoá tài khoản đều làm mất đi một admin đang hoạt động.
    const dropsAdmin = (dto.role !== undefined && dto.role !== Role.ADMIN) || dto.active === false;
    if (dropsAdmin) {
      await this.assertNotLastAdmin(target);
    }
    return this.prisma.user.update({ where: { id }, data: dto, select: SELECT });
  }

  async remove(id: string, actorId: string) {
    const target = await this.ensure(id);
    // Tự xoá mình thì mất luôn phiên đang dùng — chặn ở API chứ không chỉ ở giao diện.
    if (id === actorId) {
      throw new BadRequestException('Không thể tự xoá tài khoản đang đăng nhập');
    }
    await this.assertNotLastAdmin(target);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Đã xoá thành viên' };
  }

  /**
   * Giữ bất biến: hệ thống luôn còn ÍT NHẤT MỘT admin đang hoạt động.
   *
   * Không có chặn này thì admin duy nhất chỉ cần gạt nhầm "Quyền quản trị" hay "Tài khoản
   * hoạt động" của chính mình là không còn ai vào được Cài đặt — và cũng không có đường tự
   * cấp lại quyền, phải sửa thẳng dưới DB. Cảnh báo ở giao diện là chưa đủ: gọi trực tiếp
   * `PATCH /users/:id` (vd qua Swagger) vẫn lách được.
   */
  private async assertNotLastAdmin(target: { id: string; role: Role; active: boolean }) {
    // Người không phải admin, hoặc admin đang bị khoá sẵn, thì thao tác không làm mất admin nào.
    if (target.role !== Role.ADMIN || !target.active) return;
    const otherAdmins = await this.prisma.user.count({
      where: { role: Role.ADMIN, active: true, NOT: { id: target.id } },
    });
    if (otherAdmins === 0) {
      throw new ConflictException(
        'Đây là admin duy nhất đang hoạt động — hãy cấp quyền admin cho người khác trước khi hạ quyền, khoá hoặc xoá tài khoản này.',
      );
    }
  }

  private async ensure(id: string): Promise<{ id: string; role: Role; active: boolean }> {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, active: true },
    });
    if (!u) {
      throw new NotFoundException('Không tìm thấy thành viên');
    }
    // Prisma sinh enum Role riêng — quy về enum nội bộ để so sánh có cùng kiểu.
    return { ...u, role: u.role as Role };
  }
}
