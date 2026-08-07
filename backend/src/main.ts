import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ensureForumUploadDir } from './forum/image.util';

// CORS origins come from FRONTEND_URL — a comma-separated list, so one
// backend can serve e.g. the production domain plus a staging domain:
//   FRONTEND_URL=https://app.example.com,https://staging.example.com
// Vercel preview deployments get rotating URLs, so *.vercel.app wildcards
// are supported too:
//   FRONTEND_URL=https://myapp.vercel.app,https://*.vercel.app
function buildOriginChecker(): (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) => void {
  const raw = process.env.FRONTEND_URL ?? '';
  const entries = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const exact = new Set<string>();
  const wildcardPatterns: RegExp[] = [];

  for (const entry of entries) {
    if (entry.includes('*')) {
      // Escape regex chars, then turn the escaped \* back into a wildcard.
      const pattern = entry
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[a-z0-9-]+');
      wildcardPatterns.push(new RegExp(`^${pattern}$`, 'i'));
    } else {
      // Normalize away trailing slashes: browsers never send one in Origin.
      exact.add(entry.replace(/\/+$/, ''));
    }
  }

  return (origin, callback) => {
    // Non-browser clients (curl, health checks) send no Origin — allow.
    if (!origin) return callback(null, true);
    if (exact.has(origin) || wildcardPatterns.some((p) => p.test(origin))) {
      return callback(null, true);
    }
    // Disallow without throwing: the request still completes, just without
    // CORS headers, and the browser blocks it client-side.
    return callback(null, false);
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Forum image uploads (local disk — see forum/image.util.ts for the
  // production caveat). Directory must exist before multer's diskStorage
  // or our own fs.writeFile calls can write into it.
  await ensureForumUploadDir();
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    // Wide open only when FRONTEND_URL isn't set — convenient for local dev,
    // but production deploys must set it so CORS narrows to real domains.
    console.warn(
      'FRONTEND_URL is not set — CORS is wide open. Set it in production.',
    );
    app.enableCors({ origin: true });
  } else {
    app.enableCors({ origin: buildOriginChecker() });
  }

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}

bootstrap();
