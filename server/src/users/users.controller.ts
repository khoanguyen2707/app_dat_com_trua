import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto, ResetPasswordDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thành viên (mọi người đã đăng nhập)' })
  findAll() {
    return this.users.findAll();
  }

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Admin: tạo tài khoản thành viên (app không cho tự đăng ký)' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles(Role.ADMIN)
  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Admin: đặt lại mật khẩu cho thành viên' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(id, dto.password);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Admin: sửa thành viên (quyền, khoá, tên). Không hạ quyền/khoá được admin duy nhất đang hoạt động.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: xoá thành viên (không tự xoá mình, không xoá admin duy nhất đang hoạt động)' })
  remove(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.users.remove(id, me.id);
  }
}
