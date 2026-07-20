import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from './auth.types';

// Credential-focused user access for the auth flow. Profile/settings reads
// and writes live in UsersModule instead.
@Injectable()
export class UsersStore {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  // Login accepts either identifier. Usernames can't contain "@", so an
  // identifier with one is only ever an email; anything else is a username.
  // (Pre-upgrade accounts keep working: their email column is intact, and
  // their username is now the sanitized local part of that email.)
  async findByIdentifier(identifier: string) {
    if (identifier.includes('@')) {
      return this.findByEmail(identifier);
    }
    return this.findByUsername(identifier);
  }

  create(data: {
    username: string;
    email: string | null;
    passwordHash: string;
    role: Role;
  }) {
    return this.prisma.user.create({ data });
  }
}
