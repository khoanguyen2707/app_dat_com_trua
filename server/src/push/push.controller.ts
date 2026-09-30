import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { SubscribeDto, UnsubscribeDto } from './dto/push.dto';
import { PushService } from './push.service';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Public()
  @Get('vapid-key')
  @ApiOperation({ summary: 'Khoá công khai VAPID cho trình duyệt đăng ký. enabled=false = máy chủ chưa bật push.' })
  vapidKey() {
    return { enabled: this.push.isEnabled(), publicKey: this.push.publicKey };
  }

  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Thiết bị của tôi đang bật thông báo đẩy' })
  mine(@CurrentUser() user: AuthUser) {
    return this.push.mine(user.id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('subscribe')
  @ApiOperation({ summary: 'Đăng ký nhận thông báo đẩy cho thiết bị hiện tại' })
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    return this.push.subscribe(user.id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('subscribe')
  @ApiOperation({ summary: 'Tắt thông báo đẩy cho thiết bị hiện tại' })
  unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: UnsubscribeDto) {
    return this.push.unsubscribe(user.id, dto.endpoint);
  }
}
