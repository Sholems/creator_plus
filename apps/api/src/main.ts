import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Prisma } from '@creatormarket/database';
import { AppModule } from './app.module';
import { validateEnv } from './config/validate-env';
import { initObservability } from './common/observability';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

// JSON.stringify cannot serialize BigInt values (e.g. Product.fileSize,
// ProductFile.fileSize come back from Prisma as BigInt). Teach BigInt how to
// serialize itself: emit a plain number when it fits safely in a JS number
// (matches the `fileSize: number` shared contract), otherwise fall back to a
// string to avoid precision loss.
(BigInt.prototype as unknown as { toJSON: () => number | string }).toJSON =
  function (this: bigint) {
    return this <= BigInt(Number.MAX_SAFE_INTEGER) &&
      this >= BigInt(Number.MIN_SAFE_INTEGER)
      ? Number(this)
      : this.toString();
  };

// Prisma Decimal fields (price, rating, wallet balances, order totals, ...)
// serialize to strings by default, but the shared API contract types them as
// `number` and the web client calls numeric methods like `.toFixed()` on them.
// Serialize Decimals as numbers so responses match the contract. Marketplace
// money/rating values are well within Number's safe-integer range.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON =
  function (this: Prisma.Decimal) {
    return this.toNumber();
  };

async function bootstrap() {
  // Fail fast on missing/insecure secrets before anything else starts.
  validateEnv();

  // Optional Sentry error tracking (no-op unless SENTRY_DSN + @sentry/node).
  initObservability();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Consistent error responses + structured 5xx logging across every route.
  app.useGlobalFilters(new AllExceptionsFilter());

  // Security headers on every response.
  app.use(helmet());
  // Parse the httpOnly refresh-token cookie (see AuthController).
  app.use(cookieParser());

  app.setGlobalPrefix('api/v1');

  // Allow a comma-separated list of origins (web on :3000, admin on :3002, ...).
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3002')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const { SerializeInterceptor } = require('./common/serialize.interceptor');
  app.useGlobalInterceptors(new SerializeInterceptor());

  const config = new DocumentBuilder()
    .setTitle('CreatorPlus API')
    .setDescription('The CreatorPlus API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
