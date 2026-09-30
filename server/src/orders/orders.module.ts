import { Module } from '@nestjs/common';
import { NotificationsModule } from '@/notifications/notifications.module';
import { DebtsModule } from '@/debts/debts.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [NotificationsModule, DebtsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
