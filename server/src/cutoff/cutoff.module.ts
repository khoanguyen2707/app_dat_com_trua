import { Module } from '@nestjs/common';
import { NotificationsModule } from '@/notifications/notifications.module';
import { CutoffController } from './cutoff.controller';
import { CutoffService } from './cutoff.service';

/** Nhắc trước giờ chốt — cần cả thông báo in-app lẫn push, nên tách riêng khỏi PushModule. */
@Module({
  imports: [NotificationsModule],
  controllers: [CutoffController],
  providers: [CutoffService],
})
export class CutoffModule {}
