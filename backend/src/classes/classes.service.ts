import { HttpStatus, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { apiError } from '../common/api-envelope';

// No 0/O/1/I — join codes get read out loud in classrooms.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_MAX_RETRIES = 5;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

const MEMBER_SELECT = {
  id: true,
  role: true,
  joinedAt: true,
  user: { select: { id: true, username: true, avatar: true } },
} as const;

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async createClass(teacherId: string, name: string) {
    if (!name?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'Tên lớp học là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    for (let attempt = 0; attempt < CODE_MAX_RETRIES; attempt++) {
      const code = randomCode();
      try {
        return await this.prisma.class.create({
          data: {
            name: name.trim(),
            code,
            teacherId,
            // The creator is also a member row so "my classes" queries only
            // need to look at ClassMember.
            members: { create: { userId: teacherId, role: 'teacher' } },
          },
          include: { members: { select: MEMBER_SELECT } },
        });
      } catch (err) {
        // Unique violation on `code` — roll a new one. Anything else is real.
        const isCodeCollision =
          err instanceof Error &&
          'code' in err &&
          (err as { code?: string }).code === 'P2002';
        if (!isCodeCollision) throw err;
      }
    }

    throw apiError(
      'CODE_GENERATION_FAILED',
      'Không thể tạo mã lớp học duy nhất — vui lòng thử lại.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async joinByCode(userId: string, code: string) {
    if (!code?.trim()) {
      throw apiError(
        'VALIDATION_ERROR',
        'Mã lớp học là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const klass = await this.prisma.class.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!klass) {
      throw apiError(
        'CLASS_NOT_FOUND',
        'Không có lớp học nào với mã này.',
        HttpStatus.NOT_FOUND,
      );
    }

    // Idempotent: joining a class you're already in just returns it.
    // Joiners are always class-level students; teaching rights stay with
    // Class.teacherId.
    await this.prisma.classMember.upsert({
      where: { userId_classId: { userId, classId: klass.id } },
      create: { userId, classId: klass.id, role: 'student' },
      update: {},
    });

    return this.getDetailForMember(klass.id);
  }

  listForUser(userId: string) {
    return this.prisma.class.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { select: { id: true, username: true } },
        _count: { select: { members: true, topics: true, sets: true } },
      },
    });
  }

  async getDetail(classId: string, user: AuthenticatedUser) {
    await this.assertMember(classId, user);
    return this.getDetailForMember(classId);
  }

  private async getDetailForMember(classId: string) {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { id: true, username: true } },
        members: { select: MEMBER_SELECT, orderBy: { joinedAt: 'asc' } },
        topics: {
          orderBy: { createdAt: 'asc' },
          include: { _count: { select: { exercises: true } } },
        },
        sets: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { items: true } } },
        },
      },
    });

    if (!klass) {
      throw apiError('CLASS_NOT_FOUND', 'Lớp học không tồn tại.', HttpStatus.NOT_FOUND);
    }
    return klass;
  }

  // --- Access-control helpers shared with Topics/Sets modules ---

  async isMember(classId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.classMember.findUnique({
      where: { userId_classId: { userId, classId } },
    });
    return member !== null;
  }

  async assertMember(classId: string, user: AuthenticatedUser): Promise<void> {
    if (user.role === 'admin') return;
    if (!(await this.isMember(classId, user.sub))) {
      throw apiError(
        'FORBIDDEN',
        'Bạn không phải là thành viên của lớp học này.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // Only the class owner (or an admin) may manage its topics/sets/content.
  async assertTeacherOf(classId: string, user: AuthenticatedUser): Promise<void> {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });
    if (!klass) {
      throw apiError('CLASS_NOT_FOUND', 'Lớp học không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (user.role !== 'admin' && klass.teacherId !== user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Chỉ giáo viên của lớp học mới có thể thực hiện thao tác này.',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // Xoa han lop hoc. Cac bang tham chieu Class deu da co ON DELETE
  // CASCADE/SET NULL o muc DB (ClassMember/Topic cascade, ExerciseSet/
  // ForumPost chi go classId ve null, KHONG xoa du lieu cua giao vien) --
  // xem migration 20260719120000_platform_upgrade + 20260721090000_forum.
  async deleteClass(classId: string, user: AuthenticatedUser): Promise<void> {
    await this.assertTeacherOf(classId, user);
    await this.prisma.class.delete({ where: { id: classId } });
  }

  // Hoc sinh tu roi lop -- giao vien (chu lop) khong duoc dung API nay de
  // roi lop cua chinh minh (se lam lop mat giao vien), phai dung deleteClass.
  async leaveClass(classId: string, userId: string): Promise<void> {
    const klass = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });
    if (!klass) {
      throw apiError('CLASS_NOT_FOUND', 'Lớp học không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (klass.teacherId === userId) {
      throw apiError(
        'FORBIDDEN',
        'Giáo viên chủ nhiệm không thể tự rời lớp — hãy xóa lớp nếu muốn kết thúc.',
        HttpStatus.FORBIDDEN,
      );
    }

    const member = await this.prisma.classMember.findUnique({
      where: { userId_classId: { userId, classId } },
    });
    if (!member) {
      throw apiError(
        'FORBIDDEN',
        'Bạn không phải là thành viên của lớp học này.',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.classMember.delete({ where: { id: member.id } });
  }
}
