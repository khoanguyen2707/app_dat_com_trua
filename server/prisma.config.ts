// Prisma 7 config: connection URL cho CLI (prisma db push / migrate / studio).
// Runtime PrismaClient vẫn kết nối qua driver adapter @prisma/adapter-pg (xem prisma.service.ts).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // process.env (không dùng env() để không ném lỗi khi generate lúc build chưa có DATABASE_URL).
    // Lúc chạy thật, docker-compose / .env sẽ truyền DATABASE_URL thật vào.
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/com_trua?schema=public',
  },
});
