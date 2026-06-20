import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JwtAccessGuard } from './common/guards/jwt-access.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SeedService } from './seed/seed.service';

const logger = new Logger('COM-TRUA');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // Health nằm ngoài prefix để Render/Docker healthcheck gọi GET /health
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Guard toàn cục: yêu cầu JWT (trừ @Public) + kiểm tra role (@Roles)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAccessGuard(reflector), new RolesGuard(reflector));

  app.enableCors({
    origin: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Đặt Cơm Trưa API')
    .setDescription('API quản lý đặt cơm trưa — auth, thành viên, tuần, thực đơn, thanh toán')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' }, 'JWT-auth')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { swaggerOptions: { persistAuthorization: true } });

  // Seed admin + dữ liệu mẫu (idempotent)
  await app.get(SeedService).run();

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  const url = await app.getUrl();
  logger.log(`API chạy tại ${url}/api/v1`);
  logger.log(`Swagger docs: ${url}/docs`);
}

void bootstrap().catch((e) => {
  logger.error('Bootstrap failed', e);
  process.exit(1);
});
