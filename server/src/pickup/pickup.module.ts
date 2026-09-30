import { Module } from '@nestjs/common';
import { NotificationsModule } from '@/notifications/notifications.module';
import { PickupController } from './pickup.controller';
import { PickupService } from './pickup.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PickupController],
  providers: [PickupService],
})
export class PickupModule {}
