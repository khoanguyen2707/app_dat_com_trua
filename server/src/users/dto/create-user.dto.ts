import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '@/common/enums/role.enum';

/** Admin tạo tài khoản cho thành viên — app không cho tự đăng ký. */
export class CreateUserDto {
  @ApiProperty({ example: 'khoa@comtrua.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Anh Khoa' })
  @IsString()
  @MinLength(1, { message: 'Nhập họ tên' })
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  password: string;
}
