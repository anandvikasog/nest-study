import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ErrorCatchFilter } from './filters/errorCatch.filter';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalFilters(new ErrorCatchFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
