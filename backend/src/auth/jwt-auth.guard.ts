import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: 'student' | 'teacher';
}

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
      throw unauthorized('Missing or invalid Authorization header.');
    }

    const token = authHeader.slice('Bearer '.length);
    let decoded: Partial<AuthenticatedUser>;

    try {
      decoded = jwt.verify(token, JWT_SECRET) as Partial<AuthenticatedUser>;
    } catch {
      throw unauthorized('Invalid or expired token.');
    }

    // Tokens signed before the role system existed won't have `role` —
    // reject them cleanly (forces a fresh login, which re-signs a token
    // with the current shape) instead of letting RolesGuard silently
    // misbehave against `undefined`.
    if (!decoded?.sub || !decoded?.role) {
      throw unauthorized('Session is outdated — please log in again.');
    }

    request.user = decoded as AuthenticatedUser;
    return true;
  }
}
