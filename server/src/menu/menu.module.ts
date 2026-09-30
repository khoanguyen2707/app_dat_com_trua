import { Module } from '@nestjs/common';
import { NotificationsModule } from '@/notifications/notifications.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuWebhookService } from './menu-webhook.service';

@Module({
  imports: [NotificationsModule],
  controllers: [MenuController],
  providers: [MenuService, MenuWebhookService],
})
export class MenuModule {}
