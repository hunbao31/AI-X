import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Prisma-backed now — was an in-memory array through Step 10.
@Injectable()
export class UsersStore {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: { email: string; passwordHash: string; role: 'student' | 'teacher' }) {
    return this.prisma.user.create({ data });
  }
}
