import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '@/common/enums/role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Email Microsoft 365 thật để @mention trong Teams (người đi lấy cơm)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  teamsEmail?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
