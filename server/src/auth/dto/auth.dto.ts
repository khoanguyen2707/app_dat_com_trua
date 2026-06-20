import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'khoa@comtrua.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Nguyễn Anh Khoa' })
  @IsString()
  @MinLength(1, { message: 'Nhập họ tên' })
  @MaxLength(150)
  fullName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@comtrua.vn' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(1, { message: 'Nhập mật khẩu' })
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  oldPassword: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới tối thiểu 6 ký tự' })
  @MaxLength(72)
  newPassword: string;
}
