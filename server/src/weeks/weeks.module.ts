import { Module } from '@nestjs/common';
import { WeeksController } from './weeks.controller';
import { WeeksService } from './weeks.service';

@Module({ controllers: [WeeksController], providers: [WeeksService], exports: [WeeksService] })
export class WeeksModule {}
