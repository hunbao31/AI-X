import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Wide open (origin: true) only when FRONTEND_URL isn't set — convenient
  // for local dev, but production deploys must set FRONTEND_URL so this
  // narrows to the real frontend domain.
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    console.warn(
      'FRONTEND_URL is not set — CORS is wide open. Set it in production.',
    );
  }
  app.enableCors({ origin: frontendUrl ?? true });

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}

bootstrap();
