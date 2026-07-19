import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UsersStore } from './users.store';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const JWT_EXPIRES_IN = '1h';

export type Role = 'student' | 'teacher';
const VALID_ROLES: Role[] = ['student', 'teacher'];

function errorBody(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString() },
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly usersStore: UsersStore) {}

  async register(email: string, password: string, role?: string) {
    if (await this.usersStore.findByEmail(email)) {
      throw new HttpException(
        errorBody('EMAIL_ALREADY_REGISTERED', 'Email is already registered.'),
        HttpStatus.CONFLICT,
      );
    }

    // Self-selected at signup — there's no invite/approval flow yet, so
    // anyone can register as "teacher". Falls back to "student" if omitted
    // or invalid rather than rejecting the request.
    const resolvedRole: Role = VALID_ROLES.includes(role as Role)
      ? (role as Role)
      : 'student';

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersStore.create({
      email,
      passwordHash,
      role: resolvedRole,
    });

    return { id: user.id, email: user.email, role: user.role };
  }

  async login(email: string, password: string) {
    const user = await this.usersStore.findByEmail(email);
    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new HttpException(
        errorBody('INVALID_CREDENTIALS', 'Invalid email or password.'),
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
