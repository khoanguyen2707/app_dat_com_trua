import { Module } from '@nestjs/common';
import { PickupController } from './pickup.controller';
import { PickupService } from './pickup.service';

@Module({
  controllers: [PickupController],
  providers: [PickupService],
})
export class PickupModule {}
