import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { apiError } from '../common/api-envelope';
import { isAvatarId } from './avatars';

export type Theme = 'light' | 'dark';
const VALID_THEMES: Theme[] = ['light', 'dark'];

// Same rule the register flow enforces: 3–32 chars, no spaces, no "@".
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  role: 'student' | 'teacher' | 'admin';
  theme: Theme;
  avatar: string;
  createdAt: Date;
}

const PROFILE_SELECT = {
  id: true,
  username: true,
  email: true,
  role: true,
  theme: true,
  avatar: true,
  createdAt: true,
} as const;

export interface UpdateProfileInput {
  username?: unknown;
  avatar?: unknown;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });

    if (!user) {
      throw apiError('USER_NOT_FOUND', 'Người dùng không tồn tại.', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  // Quick-edit profile: username and/or avatar, any time.
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const data: { username?: string; avatar?: string } = {};

    if (input.username !== undefined) {
      const username = String(input.username).trim();
      if (!USERNAME_PATTERN.test(username)) {
        throw apiError(
          'INVALID_USERNAME',
          'Tên đăng nhập phải từ 3-32 ký tự, không có khoảng trắng: chữ cái, chữ số, ".", "_" hoặc "-".',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      const existing = await this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existing && existing.id !== userId) {
        throw apiError(
          'USERNAME_TAKEN',
          'Tên đăng nhập đã được sử dụng',
          HttpStatus.CONFLICT,
        );
      }
      data.username = username;
    }

    if (input.avatar !== undefined) {
      if (!isAvatarId(input.avatar)) {
        throw apiError(
          'INVALID_AVATAR',
          'Ảnh đại diện phải là một trong các ảnh đại diện có sẵn.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      data.avatar = input.avatar;
    }

    if (Object.keys(data).length === 0) {
      throw apiError(
        'VALIDATION_ERROR',
        'Vui lòng cung cấp tên đăng nhập và/hoặc ảnh đại diện để cập nhật.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.getProfile(userId); // 404s cleanly if the user vanished

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: PROFILE_SELECT,
    });
  }

  // "Continue Learning": the newest unfinished quiz attempt, if any.
  async getContinue(userId: string) {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { userId, completedAt: null },
      orderBy: { startedAt: 'desc' },
      include: {
        set: {
          select: {
            id: true,
            title: true,
            mode: true,
            isPublished: true,
            _count: { select: { items: true } },
          },
        },
      },
    });

    if (!attempt || !attempt.set.isPublished) return null;
    return {
      attemptId: attempt.id,
      setId: attempt.set.id,
      title: attempt.set.title,
      mode: attempt.set.mode,
      lastQuestionIndex: attempt.lastQuestionIndex,
      totalCount: attempt.set._count.items,
      startedAt: attempt.startedAt,
    };
  }

  async getQuizHistory(userId: string) {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 25,
      include: { set: { select: { id: true, title: true, mode: true } } },
    });
    return attempts.map((a) => ({
      attemptId: a.id,
      setId: a.set.id,
      title: a.set.title,
      mode: a.set.mode,
      score: a.score,
      correctCount: a.correctCount,
      totalCount: a.totalCount,
      durationSeconds: a.durationSeconds,
      completedAt: a.completedAt,
    }));
  }

  // Dashboard blurb: last finished quiz + last practiced topic.
  async getRecentActivity(userId: string) {
    const [lastQuiz, lastAttempt] = await Promise.all([
      this.prisma.quizAttempt.findFirst({
        where: { userId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        include: { set: { select: { id: true, title: true } } },
      }),
      this.prisma.attempt.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { topic: true, createdAt: true },
      }),
    ]);

    return {
      lastQuiz: lastQuiz
        ? {
            setId: lastQuiz.set.id,
            title: lastQuiz.set.title,
            correctCount: lastQuiz.correctCount,
            totalCount: lastQuiz.totalCount,
            score: lastQuiz.score,
            completedAt: lastQuiz.completedAt,
          }
        : null,
      lastTopic: lastAttempt
        ? { topic: lastAttempt.topic, at: lastAttempt.createdAt }
        : null,
    };
  }

  async updateSettings(userId: string, theme: unknown): Promise<UserProfile> {
    if (typeof theme !== 'string' || !VALID_THEMES.includes(theme as Theme)) {
      throw apiError(
        'VALIDATION_ERROR',
        'Giao diện phải là "light" hoặc "dark".',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.getProfile(userId); // 404s cleanly if the user vanished

    return this.prisma.user.update({
      where: { id: userId },
      data: { theme: theme as Theme },
      select: PROFILE_SELECT,
    });
  }
}
