import { Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Thông báo của tôi + số chưa đọc' })
  mine(@CurrentUser() user: AuthUser) {
    return this.notifications.listMine(user.id);
  }

  @Patch('read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc tất cả thông báo' })
  markRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }
}
