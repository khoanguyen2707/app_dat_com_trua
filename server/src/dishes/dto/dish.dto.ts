import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const CATEGORIES = ['MAIN', 'DRINK'] as const;

export class CreateDishDto {
  @ApiProperty({ example: 'Cơm gà xối mỡ' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Gà giòn, cơm thơm' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: '🍗' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  emoji?: string;

  @ApiProperty({ example: 25000 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ enum: CATEGORIES, example: 'MAIN', description: 'MAIN = món ăn, DRINK = đồ uống' })
  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];
}

export class UpdateDishDto extends PartialType(CreateDishDto) {}
