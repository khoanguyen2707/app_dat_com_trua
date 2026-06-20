import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/common/enums/role.enum';
import { PaymentService } from './payment.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@ApiTags('payment')
@ApiBearerAuth('JWT-auth')
@Controller('payment')
export class PaymentController {
  constructor(private readonly payment: PaymentService) {}

  @Get()
  @ApiOperation({ summary: 'Thông tin thanh toán (ngân hàng, STK)' })
  get() {
    return this.payment.get();
  }

  @Roles(Role.ADMIN)
  @Patch()
  @ApiOperation({ summary: 'Admin: cập nhật thông tin thanh toán' })
  update(@Body() dto: UpdatePaymentDto) {
    return this.payment.update(dto);
  }
}
