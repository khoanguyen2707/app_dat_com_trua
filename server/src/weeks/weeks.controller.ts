import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { WeeksService } from './weeks.service';
import { CreateWeekDto, UpdateWeekDto } from './dto/week.dto';

@ApiTags('weeks')
@ApiBearerAuth('JWT-auth')
@Controller('weeks')
export class WeeksController {
  constructor(private readonly weeks: WeeksService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tuần + tổng kết (lịch sử)' })
  findAll() {
    return this.weeks.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Bảng tuần hiện hành (grid + tổng)' })
  getActive() {
    return this.weeks.getActive();
  }

  @Get(':id/grid')
  @ApiOperation({ summary: 'Bảng của một tuần bất kỳ' })
  getGrid(@Param('id') id: string) {
    return this.weeks.getGrid(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Admin: tạo tuần mới' })
  create(@Body() dto: CreateWeekDto) {
    return this.weeks.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Admin: sửa tuần (đơn giá, nhãn, món/ngày, kích hoạt)' })
  update(@Param('id') id: string, @Body() dto: UpdateWeekDto) {
    return this.weeks.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: xoá tuần' })
  remove(@Param('id') id: string) {
    return this.weeks.remove(id);
  }
}
