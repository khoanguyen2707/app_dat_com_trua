import { Body, Controller, Param, Patch, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { SetPaidDto, UpsertOrderDto } from './dto/order.dto';

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

  @Roles(Role.ADMIN)
  @Put(':userId')
  @ApiOperation({ summary: 'Admin: tích ngày hộ một thành viên' })
  upsertFor(@Param('userId') userId: string, @Body() dto: UpsertOrderDto) {
    return this.orders.upsert(userId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('paid')
  @ApiOperation({ summary: 'Admin: đánh dấu đã/chưa thanh toán' })
  setPaid(@Body() dto: SetPaidDto) {
    return this.orders.setPaid(dto);
  }
}
