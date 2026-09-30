import { Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CutoffService } from './cutoff.service';

@ApiTags('push')
@Controller('push')
export class CutoffController {
  constructor(
    private readonly cutoff: CutoffService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Máy-tới-máy (Power Automate). Token riêng cho push, lùi về PICKUP_TOKEN nếu chưa
   * đặt. CHỈ nhận qua header — query string bị ghi vào access log và Referer.
   */
  private assertToken(token?: string): void {
    const expected = this.config.get<string>('PUSH_TOKEN') || this.config.get<string>('PICKUP_TOKEN');
    if (!expected || !token || token !== expected) {
      throw new UnauthorizedException('Sai hoặc thiếu token push');
    }
  }

  @Public()
  @Post('cutoff-reminder')
  @ApiOperation({
    summary:
      'Nhắc người chưa đặt cơm trước giờ chốt (Power Automate gọi ~09:45 T2–T6). ' +
      'Cần header x-push-token. Idempotent trong ngày; trả skipped khi không cần gửi.',
  })
  remind(@Headers('x-push-token') token?: string) {
    this.assertToken(token);
    return this.cutoff.remind();
  }
}
