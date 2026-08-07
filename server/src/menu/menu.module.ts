import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuWebhookService } from './menu-webhook.service';

@Module({ controllers: [MenuController], providers: [MenuService, MenuWebhookService] })
export class MenuModule {}
