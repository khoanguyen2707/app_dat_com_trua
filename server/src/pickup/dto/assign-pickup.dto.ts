import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class AssignPickupDto {
  @ApiProperty({ example: 'chuong@comtrua.vn', description: 'Email thành viên nhận lượt' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiPropertyOptional({
    example: '2026-09-21',
    description: 'Ngày theo lịch VN (YYYY-MM-DD). Bỏ trống = hôm nay.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày phải theo định dạng YYYY-MM-DD' })
  date?: string;
}
