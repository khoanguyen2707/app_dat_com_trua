import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

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

export class SetPaidDto {
  @ApiProperty() @IsString() weekId: string;
  @ApiProperty() @IsString() userId: string;
  @ApiProperty() @IsBoolean() paid: boolean;
}
