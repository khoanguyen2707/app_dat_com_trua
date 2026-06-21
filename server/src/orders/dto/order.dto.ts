import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { DAY_KEYS, type DayKey } from '@/common/week-lock';

export class UpsertOrderDto {
  @ApiProperty()
  @IsString()
  weekId: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() mon?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() tue?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() wed?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() thu?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() fri?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sat?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sun?: boolean;
}

const PAYMENT_STATUSES = ['UNPAID', 'PENDING', 'PAID'] as const;

/** Admin đặt trạng thái thanh toán của 1 thành viên. */
export class SetPaymentStatusDto {
  @ApiProperty() @IsString() weekId: string;
  @ApiProperty() @IsString() userId: string;

  @ApiProperty({ enum: PAYMENT_STATUSES, example: 'PAID' })
  @IsIn(PAYMENT_STATUSES)
  status: (typeof PAYMENT_STATUSES)[number];
}

/** User báo / huỷ báo đã chuyển khoản. */
export class ReportPaymentDto {
  @ApiProperty() @IsString() weekId: string;

  @ApiProperty({ description: 'true = báo đã chuyển khoản; false = huỷ báo' })
  @IsBoolean()
  report: boolean;
}

export class DrinkItemDto {
  @ApiProperty() @IsString() dishId: string;
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) qty: number;
}

/** Đặt chi tiết 1 ngày: ăn cơm? + mix món + đồ uống (theo từng ngày). */
export class SetDayDetailDto {
  @ApiProperty() @IsString() weekId: string;

  @ApiProperty({ enum: DAY_KEYS, example: 'mon' })
  @IsIn(DAY_KEYS)
  day: DayKey;

  @ApiProperty({ description: 'Có ăn cơm (25k) ngày này không' })
  @IsBoolean()
  eat: boolean;

  @ApiPropertyOptional({ type: [String], description: 'dishId các món ăn (mix nhiều món vẫn 25k)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  food?: string[];

  @ApiPropertyOptional({ type: [DrinkItemDto], description: 'Đồ uống + số lượng (tính tiền riêng)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrinkItemDto)
  drinks?: DrinkItemDto[];
}
