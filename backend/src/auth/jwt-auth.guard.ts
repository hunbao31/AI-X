import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedUser } from './auth.types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

// Re-exported so existing `import { AuthenticatedUser } from '../auth/jwt-auth.guard'`
// call sites keep compiling; the canonical home is auth.types.ts.
export type { AuthenticatedUser } from './auth.types';

function unauthorized(message: string) {
  return new HttpException(
    {
      success: false,
      error: { code: 'UNAUTHORIZED', message },
      meta: { timestamp: new Date().toISOString() },
    },
    HttpStatus.UNAUTHORIZED,
  );
}

// Minimal hand-rolled guard (no passport-jwt) — reads "Authorization: Bearer <token>"
// and verifies it with the same secret used to sign tokens in AuthService.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw unauthorized('Thiếu hoặc sai định dạng tiêu đề Authorization.');
    }

    const token = authHeader.slice('Bearer '.length);
    let decoded: Partial<AuthenticatedUser>;

    try {
      decoded = jwt.verify(token, JWT_SECRET) as Partial<AuthenticatedUser>;
    } catch {
      throw unauthorized('Token không hợp lệ hoặc đã hết hạn.');
    }

    // Tokens signed before the username/role system existed won't carry these
    // claims — reject them cleanly (forces a fresh login, which re-signs a
    // token with the current shape) instead of letting downstream code
    // misbehave against `undefined`.
    if (!decoded?.sub || !decoded?.role || !decoded?.username) {
      throw unauthorized('Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.');
    }

    request.user = {
      sub: decoded.sub,
      username: decoded.username,
      email: decoded.email ?? null,
      role: decoded.role,
    } satisfies AuthenticatedUser;
    return true;
  }
}
