import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { DishesService } from './dishes.service';
import { CreateDishDto, UpdateDishDto } from './dto/dish.dto';

@ApiTags('dishes')
@ApiBearerAuth('JWT-auth')
@Controller('dishes')
export class DishesController {
  constructor(private readonly dishes: DishesService) {}

  @Get()
  @ApiOperation({ summary: 'Xem thực đơn' })
  findAll() {
    return this.dishes.findAll();
  }

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Admin: thêm món' })
  create(@Body() dto: CreateDishDto) {
    return this.dishes.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Admin: sửa món' })
  update(@Param('id') id: string, @Body() dto: UpdateDishDto) {
    return this.dishes.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: xoá món' })
  remove(@Param('id') id: string) {
    return this.dishes.remove(id);
  }
}
