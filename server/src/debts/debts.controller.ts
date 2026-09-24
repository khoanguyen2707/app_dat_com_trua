import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { DebtsService } from './debts.service';

@ApiTags('debts')
@Controller('debts')
export class DebtsController {
  constructor(
    private readonly debts: DebtsService,
    private readonly config: ConfigService,
  ) {}

  /** Máy-tới-máy (Power Automate): dùng chung token PICKUP_TOKEN, CHỈ nhận qua header. */
  private assertToken(token?: string): void {
    const expected = this.config.get<string>('PICKUP_TOKEN');
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Sai hoặc thiếu token');
    }
  }

  @Public()
  @Get('reminder')
  @ApiOperation({
    summary:
      'Báo cáo nhắc công nợ (Power Automate gọi thứ 2 9h, thứ 6 15h). Trả text/html kèm link thanh toán ' +
      '(APP_URL/#pay) và link admin xác nhận (APP_URL/#pay-pending). Cần header x-pickup-token.',
  })
  reminder(@Headers('x-pickup-token') token?: string) {
    this.assertToken(token);
    return this.debts.report();
  }

  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Các tuần tôi còn nợ (chưa được xác nhận), kèm chi tiết' })
  mine(@CurrentUser() user: AuthUser) {
    return this.debts.mine(user.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Admin: công nợ mọi tuần của mọi người' })
  all() {
    return this.debts.all();
  }
}
