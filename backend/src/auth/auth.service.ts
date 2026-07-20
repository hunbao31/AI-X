import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UsersStore } from './users.store';
import { Role, SELF_SIGNUP_ROLES } from './auth.types';
import { apiError } from '../common/api-envelope';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const JWT_EXPIRES_IN = '1h';

// 3–32 chars: letters, digits, dot, underscore, hyphen. No "@" so usernames
// can never collide with the email form of a login identifier.
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  theme: 'light' | 'dark';
  avatar: string;
}

function toPublicUser(user: {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  theme: 'light' | 'dark';
  avatar: string;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    theme: user.theme,
    avatar: user.avatar,
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly usersStore: UsersStore) {}

  async register(
    username: string,
    password: string,
    email?: string | null,
    role?: string,
  ): Promise<PublicUser> {
    if (!USERNAME_PATTERN.test(username)) {
      throw apiError(
        'INVALID_USERNAME',
        'Username must be 3-32 characters: letters, digits, ".", "_" or "-".',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (await this.usersStore.findByUsername(username)) {
      throw apiError(
        'USERNAME_ALREADY_REGISTERED',
        'Username is already taken.',
        HttpStatus.CONFLICT,
      );
    }

    const normalizedEmail = email?.trim() ? email.trim() : null;
    if (normalizedEmail && (await this.usersStore.findByEmail(normalizedEmail))) {
      throw apiError(
        'EMAIL_ALREADY_REGISTERED',
        'Email is already registered.',
        HttpStatus.CONFLICT,
      );
    }

    // Self-selected at signup — there's no invite/approval flow yet, so
    // anyone can register as "teacher". Falls back to "student" if omitted
    // or invalid rather than rejecting the request. "admin" is never
    // self-assignable.
    const resolvedRole: Role = SELF_SIGNUP_ROLES.includes(role as Role)
      ? (role as Role)
      : 'student';

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersStore.create({
      username,
      email: normalizedEmail,
      passwordHash,
      role: resolvedRole,
    });

    return toPublicUser(user);
  }

  // `identifier` is a username OR an email.
  async login(
    identifier: string,
    password: string,
  ): Promise<{ token: string; user: PublicUser }> {
    const user = await this.usersStore.findByIdentifier(identifier.trim());
    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw apiError(
        'INVALID_CREDENTIALS',
        'Invalid username/email or password.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    return { token, user: toPublicUser(user) };
  }
}
