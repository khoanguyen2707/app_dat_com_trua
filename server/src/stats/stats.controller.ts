import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { StatsService } from './stats.service';

@ApiTags('stats')
@ApiBearerAuth('JWT-auth')
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('me')
  @ApiQuery({ name: 'month', required: false, example: '2026-09', description: 'Bỏ trống = tháng hiện tại' })
  @ApiOperation({ summary: 'Thống kê của tôi trong một tháng: suất, tiền, tỉ lệ đi ăn, top món, lượt lấy cơm' })
  me(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.stats.myMonth(user.id, month ?? '');
  }

  @Get('my-top-dishes')
  @ApiOperation({ summary: 'Món tôi hay đặt trong 90 ngày gần nhất (để xếp lại picker)' })
  myTop(@CurrentUser() user: AuthUser) {
    return this.stats.myTopDishes(user.id);
  }

  @Roles(Role.ADMIN)
  @Get('today')
  @ApiOperation({
    summary:
      'Admin: bảng "hôm nay" — tổng suất, breakdown món/đồ uống, ghi chú riêng, ' +
      'trạng thái gửi quán, người đi lấy cơm, và text đơn để dán cho quán.',
  })
  today() {
    return this.stats.today();
  }
}
