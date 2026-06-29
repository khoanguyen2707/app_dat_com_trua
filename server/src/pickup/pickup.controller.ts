import { Controller, Get, Headers, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { PickupService } from './pickup.service';

@ApiTags('pickup')
@Controller('pickup')
export class PickupController {
  constructor(
    private readonly pickup: PickupService,
    private readonly config: ConfigService,
  ) {}

  /** Máy-tới-máy (Power Automate): chặn bằng token bí mật trong env PICKUP_TOKEN. */
  private assertToken(token?: string): void {
    const expected = this.config.get<string>('PICKUP_TOKEN');
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Sai hoặc thiếu token lấy cơm');
    }
  }

  @Public()
  @Post('today')
  @ApiOperation({
    summary: 'Bốc người đi lấy cơm hôm nay (xoay tua công bằng) — gọi từ Power Automate. Cần header x-pickup-token.',
  })
  draw(@Headers('x-pickup-token') header?: string, @Query('token') token?: string) {
    this.assertToken(header ?? token);
    return this.pickup.draw();
  }

  @Public()
  @Get('today')
  @ApiOperation({ summary: 'Xem người đã chốt hôm nay (không bốc mới). Cần token.' })
  today(@Headers('x-pickup-token') header?: string, @Query('token') token?: string) {
    this.assertToken(header ?? token);
    return this.pickup.today();
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN)
  @Get('history')
  @ApiOperation({ summary: 'Admin: lịch sử lượt đi lấy cơm gần đây' })
  history() {
    return this.pickup.history();
  }
}
