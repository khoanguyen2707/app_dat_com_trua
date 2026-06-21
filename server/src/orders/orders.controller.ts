import { Body, Controller, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { SetDayDetailDto, SetPaidDto, UpsertOrderDto } from './dto/order.dto';

@ApiTags('orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Put('me')
  @ApiOperation({ summary: 'Cập nhật đăng ký ăn của chính mình (tích ngày)' })
  upsertMine(@CurrentUser() user: AuthUser, @Body() dto: UpsertOrderDto) {
    return this.orders.upsert(user.id, dto, true);
  }

  @Put('me/day')
  @ApiOperation({ summary: 'Đặt chi tiết 1 ngày của chính mình (ăn cơm + mix món + đồ uống)' })
  setMyDay(@CurrentUser() user: AuthUser, @Body() dto: SetDayDetailDto) {
    return this.orders.setDayDetail(user.id, dto, true);
  }

  @Roles(Role.ADMIN)
  @Put(':userId')
  @ApiOperation({ summary: 'Admin: tích ngày hộ một thành viên' })
  upsertFor(@Param('userId') userId: string, @Body() dto: UpsertOrderDto) {
    return this.orders.upsert(userId, dto);
  }

  @Roles(Role.ADMIN)
  @Put(':userId/day')
  @ApiOperation({ summary: 'Admin: đặt chi tiết 1 ngày hộ thành viên (bỏ qua khoá)' })
  setUserDay(@Param('userId') userId: string, @Body() dto: SetDayDetailDto) {
    return this.orders.setDayDetail(userId, dto, false);
  }

  @Roles(Role.ADMIN)
  @Patch('paid')
  @ApiOperation({ summary: 'Admin: đánh dấu đã/chưa thanh toán' })
  setPaid(@Body() dto: SetPaidDto) {
    return this.orders.setPaid(dto);
  }
}
