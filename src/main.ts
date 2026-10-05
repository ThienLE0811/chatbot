import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
require('dotenv').config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Behind a proxy (Render, Nginx...) every request comes from the proxy's
  // address; trusting it makes req.ip the caller's, which the login rate
  // limit counts by. Off by default: without a proxy, X-Forwarded-For is
  // whatever the caller wants it to be.
  if (process.env.TRUST_PROXY) {
    app.set(
      'trust proxy',
      Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY,
    );
  }
  app.use(helmet());
  // Logins travel as `Authorization: Bearer`, not cookies, so any origin may call.
  app.enableCors();
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
