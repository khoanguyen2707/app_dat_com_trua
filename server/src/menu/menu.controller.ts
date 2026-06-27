import { Body, Controller, Delete, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import type { DayKey } from '@/common/week-lock';
import { MenuService } from './menu.service';
import { ApplyDayMenuDto, ParseMenuDto } from './dto/menu.dto';

@ApiTags('menu')
@ApiBearerAuth('JWT-auth')
@Roles(Role.ADMIN)
@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Admin: phân tích text thực đơn (xem trước, không ghi DB)' })
  parse(@Body() dto: ParseMenuDto) {
    return this.menu.parse(dto.text);
  }

  @Post('day')
  @ApiOperation({ summary: 'Admin: áp dụng thực đơn 1 ngày (tạo món mới + đặt món bán hôm nay)' })
  applyDay(@Body() dto: ApplyDayMenuDto) {
    return this.menu.applyDay(dto);
  }

  @Delete('day/:day')
  @ApiOperation({ summary: 'Admin: gỡ thực đơn 1 ngày (ngày đó hiện full catalog lại)' })
  clearDay(@Param('day') day: DayKey, @Query('weekId') weekId?: string) {
    return this.menu.clearDay(day, weekId);
  }
}
