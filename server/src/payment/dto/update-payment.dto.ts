import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  groupName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Mã BIN ngân hàng cho VietQR, vd TPBank=970423' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankBin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  accountHolder?: string;

  @ApiPropertyOptional({
    example: 200000,
    description: 'Nợ vượt ngưỡng này (đồng) thì khoá đặt cơm. 0 = tắt rule.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  debtLimit?: number;
}
