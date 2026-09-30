import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
require('dotenv').config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Logins travel as `Authorization: Bearer`, not cookies, so any origin may call.
  app.enableCors();
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
