import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { DAY_KEYS, type DayKey } from '@/common/week-lock';

const CATEGORIES = ['MAIN', 'DRINK'] as const;

/** Admin dán text thực đơn để phân tích (xem trước, KHÔNG ghi DB). */
export class ParseMenuDto {
  @ApiProperty({ example: 'Thực đơn hôm nay:\nCá kho\nGà chiên mắm\n🌼Nước đậu 10k ly' })
  @IsString()
  @MaxLength(5000)
  text: string;
}

/** Một món mới admin duyệt tạo. */
export class NewDishDto {
  @ApiProperty({ example: 'Cá diêu hồng kho' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ enum: CATEGORIES, example: 'MAIN' })
  @IsIn(CATEGORIES)
  category: (typeof CATEGORIES)[number];

  @ApiPropertyOptional({ example: 10000, description: 'Giá (đồ uống). Bỏ trống: món ăn = đơn giá tuần, đồ uống = 0' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
}

/** Áp dụng thực đơn cho 1 ngày: tạo món mới + đặt tập món bán hôm nay. */
export class ApplyDayMenuDto {
  @ApiPropertyOptional({ description: 'Bỏ trống = tuần đang mở' })
  @IsOptional()
  @IsString()
  weekId?: string;

  @ApiProperty({ enum: DAY_KEYS, example: 'mon' })
  @IsIn(DAY_KEYS)
  day: DayKey;

  @ApiProperty({ type: [NewDishDto], description: 'Món MỚI cần tạo (đã duyệt)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewDishDto)
  create: NewDishDto[];

  @ApiProperty({ type: [String], description: 'dishId các món ĐÃ CÓ bán hôm nay' })
  @IsArray()
  @IsString({ each: true })
  dishIds: string[];
}
