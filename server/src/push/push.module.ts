import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';

/**
 * Chỉ giữ việc đăng ký thiết bị + gửi push. KHÔNG phụ thuộc NotificationsModule —
 * chiều phụ thuộc là Notifications → Push, nên gộp ngược lại sẽ thành vòng.
 * Việc nhắc trước giờ chốt (cần cả hai) nằm ở CutoffModule.
 */
@Module({
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
