import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { AuthenticatedUser, Role } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    // Admin passes every role gate — platform superuser.
    if (user?.role === 'admin') {
      return true;
    }

    if (!user || !requiredRoles.includes(user.role)) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to perform this action.',
          },
          meta: { timestamp: new Date().toISOString() },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
