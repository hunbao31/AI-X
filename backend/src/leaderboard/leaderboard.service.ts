import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from '../classes/classes.service';
import { AuthenticatedUser } from '../auth/auth.types';

const LEADERBOARD_SIZE = 20;

export interface XpLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classesService: ClassesService,
  ) {}

  // Top students platform-wide by lifetime XP.
  async global(): Promise<XpLeaderboardEntry[]> {
    const rows = await this.prisma.gamification.findMany({
      where: { user: { role: 'student' } },
      orderBy: [{ xp: 'desc' }, { level: 'desc' }],
      take: LEADERBOARD_SIZE,
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });

    return rows.map((row, i) => ({
      rank: i + 1,
      userId: row.userId,
      username: row.user.username,
      avatar: row.user.avatar,
      xp: row.xp,
      level: row.level,
      streak: row.streak,
    }));
  }

  // Students of one class by XP. Members with no activity yet appear with
  // 0 XP so the roster feels complete, not empty.
  async forClass(classId: string, user: AuthenticatedUser): Promise<XpLeaderboardEntry[]> {
    await this.classesService.assertMember(classId, user);

    const members = await this.prisma.classMember.findMany({
      where: { classId, role: 'student' },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });

    const gamification = await this.prisma.gamification.findMany({
      where: { userId: { in: members.map((m) => m.userId) } },
    });
    const byUser = new Map(gamification.map((g) => [g.userId, g]));

    return members
      .map((m) => {
        const g = byUser.get(m.userId);
        return {
          userId: m.userId,
          username: m.user.username,
          avatar: m.user.avatar,
          xp: g?.xp ?? 0,
          level: g?.level ?? 0,
          streak: g?.streak ?? 0,
        };
      })
      .sort((a, b) => b.xp - a.xp || b.level - a.level)
      .slice(0, LEADERBOARD_SIZE)
      .map((entry, i) => ({ rank: i + 1, ...entry }));
  }
}
