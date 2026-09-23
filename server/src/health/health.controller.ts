import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { APP_COMMIT, APP_VERSION, STARTED_AT } from '@/common/app-version';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Sống chưa + đang chạy bản nào. Dùng để đối chiếu với version của web: lệch nhau ' +
      'nghĩa là một trong hai chưa deploy xong.',
  })
  check() {
    return {
      status: 'ok',
      service: 'com-trua',
      version: APP_VERSION,
      commit: APP_COMMIT,
      startedAt: STARTED_AT,
      time: new Date().toISOString(),
    };
  }
}
