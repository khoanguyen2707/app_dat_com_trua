import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateWeekDto {
  @ApiProperty({ example: '22/6/2026 - 27/6/2026' })
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({
    example: '2026-06-22',
    description: 'Ngày Thứ 2 đầu tuần (YYYY-MM-DD) để khoá tick theo ngày',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: 25000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'true = đặt làm tuần hiện hành' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWeekDto extends PartialType(CreateWeekDto) {
  @ApiPropertyOptional({ description: 'Gán món theo ngày: { "mon": dishId, ... }' })
  @IsOptional()
  @IsObject()
  dayMenu?: Record<string, string>;
}
