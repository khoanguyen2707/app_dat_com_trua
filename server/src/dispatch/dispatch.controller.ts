import { Body, Controller, Delete, Get, Headers, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { DispatchService } from './dispatch.service';

@ApiTags('dispatch')
@Controller('dispatch')
export class DispatchController {
  constructor(
    private readonly dispatch: DispatchService,
    private readonly config: ConfigService,
  ) {}

  /** Máy-tới-máy (Power Automate): dùng chung token với luồng lấy cơm. */
  private assertToken(token?: string): void {
    const expected = this.config.get<string>('PICKUP_TOKEN');
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Sai hoặc thiếu token');
    }
  }

  @Public()
  @Post('today')
  @ApiOperation({
    summary:
      'Power Automate gọi định kỳ trong khung giờ chốt → giờ quán đóng. Trả về level cần nhắc ' +
      '(idle/first/second/escalate) kèm text, html và danh sách người cần @mention. ' +
      'Gọi lại trong cùng một mức sẽ trả idle nên flow không spam. Cần header x-pickup-token.',
  })
  poll(@Headers('x-pickup-token') header?: string, @Query('token') token?: string) {
    this.assertToken(header ?? token);
    return this.dispatch.poll();
  }

  @Public()
  @Get('today')
  @ApiOperation({ summary: 'Xem trạng thái hôm nay, KHÔNG ghi nhận mức nhắc. Cần token.' })
  peek(@Headers('x-pickup-token') header?: string, @Query('token') token?: string) {
    this.assertToken(header ?? token);
    return this.dispatch.peek();
  }

  @Public()
  @Post('today/sent-hook')
  @ApiOperation({
    summary:
      'Nút "Đã gửi quán" bấm từ thẻ Teams → Power Automate gọi vào đây. Truyền email người bấm ' +
      'để ghi đúng ai đã gửi. Cần token.',
  })
  async sentHook(
    @Body() body: { email?: string },
    @Headers('x-pickup-token') header?: string,
    @Query('token') token?: string,
  ) {
    this.assertToken(header ?? token);
    const userId = await this.dispatch.findByTeamsEmail(body?.email);
    return this.dispatch.markSent(userId);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('today/status')
  @ApiOperation({ summary: 'Trạng thái gửi đơn hôm nay (cho app hiển thị)' })
  status() {
    return this.dispatch.peek();
  }

  @ApiBearerAuth('JWT-auth')
  @Post('today/sent')
  @ApiOperation({ summary: 'Đánh dấu đã gửi đơn cho quán' })
  markSent(@CurrentUser() user: AuthUser) {
    return this.dispatch.markSent(user.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('today/sent')
  @ApiOperation({ summary: 'Bỏ đánh dấu đã gửi (bấm nhầm)' })
  clearSent() {
    return this.dispatch.clearSent();
  }
}
