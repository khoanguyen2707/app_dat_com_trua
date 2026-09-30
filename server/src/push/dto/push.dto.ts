import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/** Đúng hình dạng `PushSubscription.toJSON()` của trình duyệt. */
export class SubscribeDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/abc...' })
  @IsString()
  @MaxLength(1000)
  endpoint: string;

  @ApiProperty({ description: 'keys.p256dh + keys.auth do trình duyệt cấp' })
  @IsObject()
  keys: { p256dh?: string; auth?: string };

  @ApiPropertyOptional({ description: 'navigator.userAgent — chỉ để admin nhận ra thiết bị' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  userAgent?: string;
}

export class UnsubscribeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  endpoint: string;
}
