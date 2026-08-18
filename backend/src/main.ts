import { NestFactory } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Behind Dokploy/Traefik there is exactly one trusted proxy hop. With
  // trust proxy off, req.ip is the proxy IP — one client could trip the
  // global rate limit for EVERYONE, and per-IP throttling of login/license
  // brute force was a no-op. `1` trusts only that outermost hop, so client
  // spoofed X-Forwarded-For values appended beyond it are ignored.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS: in production, restrict to CORS_ORIGINS (comma-separated) so only
  // our own frontends can make credentialed cross-origin calls. Development
  // stays permissive for local tooling.
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  let corsOrigin: any = true;
  if (configuredOrigins.length > 0) {
    corsOrigin = configuredOrigins;
  } else if (process.env.NODE_ENV === 'production') {
    logger.error(
      'CORS_ORIGINS is not set — allowing ALL origins. Set CORS_ORIGINS=https://your-frontend-domain (comma-separate multiple domains).',
    );
  }

  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix for all API endpoints
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global response interceptor & exception filter
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(
    `🚀 License Key Management API Server is running on: http://localhost:${port}/api/v1`,
  );
}
bootstrap();
