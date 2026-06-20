import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateWeekDto {
  @ApiProperty({ example: '22/6/2026 - 27/6/2026' })
  @IsString()
  @MaxLength(100)
  label: string;

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
