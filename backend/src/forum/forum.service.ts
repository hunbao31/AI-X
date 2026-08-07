import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassesService } from '../classes/classes.service';
import { GamificationService } from '../gamification/gamification.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { apiError } from '../common/api-envelope';
import { CreateForumPostDto, CreateForumAnswerDto, ForumFeedQuery, ForumSort } from './dto/forum.dto';
import { hashImage, saveForumImage, sniffImageMime } from './image.util';

// Anti-spam: cheap, DB-backed (works correctly across multiple server
// instances, unlike an in-memory counter).
const POST_COOLDOWN_MS = 20_000;
const ANSWER_COOLDOWN_MS = 5_000;
const DUPLICATE_IMAGE_WINDOW_MS = 5 * 60_000;

const MIN_ANSWER_LENGTH = 2;
const MAX_ANSWER_LENGTH = 2_000;
const MAX_DESCRIPTION_LENGTH = 1_000;

// XP reward schedule.
const XP_ANSWER_BASE = 10;
const XP_UPVOTE = 5;
const XP_ACCEPTED = 50;

const FEED_DEFAULT_LIMIT = 20;
const FEED_MAX_LIMIT = 50;

const AUTHOR_SELECT = { id: true, username: true, avatar: true } as const;

const FEED_SELECT = {
  id: true,
  imageUrl: true,
  description: true,
  answerCount: true,
  rewardScore: true,
  hasAcceptedAnswer: true,
  createdAt: true,
  author: { select: AUTHOR_SELECT },
  topic: { select: { id: true, name: true } },
  class: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classesService: ClassesService,
    private readonly gamificationService: GamificationService,
  ) {}

  // --- posts ---

  async createPost(
    user: AuthenticatedUser,
    file: Express.Multer.File | undefined,
    dto: CreateForumPostDto,
  ) {
    if (!file) {
      throw apiError(
        'IMAGE_REQUIRED',
        'Cần có hình ảnh cho câu hỏi của bạn.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const sniffed = sniffImageMime(file.buffer);
    if (!sniffed) {
      throw apiError(
        'INVALID_IMAGE',
        'Tệp này không giống định dạng JPEG, PNG, WebP hoặc GIF hợp lệ.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Duplicate-check before the rate limit: it's the more specific,
    // actionable message when both would fire (re-submitting the exact same
    // photo quickly), and it doesn't require slowing the user down when
    // what's actually wrong is that this exact image already exists.
    const hash = hashImage(file.buffer);
    const recentDuplicate = await this.prisma.forumPost.findFirst({
      where: {
        authorId: user.sub,
        imageHash: hash,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_IMAGE_WINDOW_MS) },
      },
      select: { id: true },
    });
    if (recentDuplicate) {
      throw apiError(
        'DUPLICATE_IMAGE',
        'Bạn đã đăng hình ảnh này gần đây rồi.',
        HttpStatus.CONFLICT,
      );
    }

    await this.assertNotRateLimited(user.sub);

    const description = dto.description?.trim() || null;
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      throw apiError(
        'VALIDATION_ERROR',
        `Mô tả không được vượt quá ${MAX_DESCRIPTION_LENGTH} ký tự.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const scope = await this.resolveScope(user, dto.topicId, dto.classId);
    const imageUrl = await saveForumImage(file.buffer, sniffed);

    return this.prisma.forumPost.create({
      data: {
        imageUrl,
        imageHash: hash,
        description,
        authorId: user.sub,
        topicId: scope.topicId,
        classId: scope.classId,
      },
      select: FEED_SELECT,
    });
  }

  async listPosts(user: AuthenticatedUser, query: ForumFeedQuery) {
    const sort: ForumSort =
      query.sort === 'most_answered' || query.sort === 'most_rewarded'
        ? query.sort
        : 'newest';
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(
      FEED_MAX_LIMIT,
      Math.max(1, Number.parseInt(query.limit ?? '', 10) || FEED_DEFAULT_LIMIT),
    );

    const visibility =
      user.role === 'admin' ? undefined : await this.visibilityClause(user.sub);

    const clauses = [visibility, query.topicId ? { topicId: query.topicId } : undefined,
      query.classId ? { classId: query.classId } : undefined].filter(
      (c): c is NonNullable<typeof c> => c !== undefined,
    );

    const orderBy =
      sort === 'most_answered'
        ? [{ answerCount: 'desc' as const }, { createdAt: 'desc' as const }]
        : sort === 'most_rewarded'
          ? [{ rewardScore: 'desc' as const }, { createdAt: 'desc' as const }]
          : [{ createdAt: 'desc' as const }];

    const rows = await this.prisma.forumPost.findMany({
      where: clauses.length > 0 ? { AND: clauses } : undefined,
      orderBy,
      skip: (page - 1) * limit,
      take: limit + 1,
      select: FEED_SELECT,
    });

    const hasMore = rows.length > limit;
    return { items: rows.slice(0, limit), page, limit, hasMore, sort };
  }

  async getPostDetail(user: AuthenticatedUser, postId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { ...FEED_SELECT, classId: true },
    });
    if (!post) {
      throw apiError('POST_NOT_FOUND', 'Câu hỏi không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (post.classId) {
      await this.classesService.assertMember(post.classId, user);
    }

    const answers = await this.prisma.forumAnswer.findMany({
      where: { postId },
      orderBy: [
        { isAccepted: 'desc' },
        { upvoteCount: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        content: true,
        imageUrl: true,
        isAccepted: true,
        upvoteCount: true,
        createdAt: true,
        author: { select: AUTHOR_SELECT },
      },
    });

    const myUpvotes = new Set(
      (
        await this.prisma.forumAnswerUpvote.findMany({
          where: { userId: user.sub, answerId: { in: answers.map((a) => a.id) } },
          select: { answerId: true },
        })
      ).map((v) => v.answerId),
    );

    return {
      ...post,
      answers: answers.map((a) => ({ ...a, upvotedByMe: myUpvotes.has(a.id) })),
    };
  }

  // --- answers ---

  async createAnswer(
    user: AuthenticatedUser,
    file: Express.Multer.File | undefined,
    dto: CreateForumAnswerDto,
  ) {
    if (!dto?.postId) {
      throw apiError(
        'VALIDATION_ERROR',
        'postId là bắt buộc.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const content = (dto.content ?? '').trim();
    if (content.length < MIN_ANSWER_LENGTH) {
      throw apiError(
        'VALIDATION_ERROR',
        `Câu trả lời phải có ít nhất ${MIN_ANSWER_LENGTH} ký tự.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (content.length > MAX_ANSWER_LENGTH) {
      throw apiError(
        'VALIDATION_ERROR',
        `Câu trả lời không được vượt quá ${MAX_ANSWER_LENGTH} ký tự.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const post = await this.prisma.forumPost.findUnique({
      where: { id: dto.postId },
      select: { id: true, classId: true },
    });
    if (!post) {
      throw apiError('POST_NOT_FOUND', 'Câu hỏi không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (post.classId) {
      await this.classesService.assertMember(post.classId, user);
    }

    await this.assertNotRateLimited(user.sub, 'answer');

    let imageUrl: string | null = null;
    if (file) {
      const sniffed = sniffImageMime(file.buffer);
      if (!sniffed) {
        throw apiError(
          'INVALID_IMAGE',
          'Tệp này không giống định dạng JPEG, PNG, WebP hoặc GIF hợp lệ.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
      imageUrl = await saveForumImage(file.buffer, sniffed);
    }

    return this.prisma.$transaction(async (tx) => {
      const answer = await tx.forumAnswer.create({
        data: { content, imageUrl, authorId: user.sub, postId: post.id },
        select: {
          id: true,
          content: true,
          imageUrl: true,
          isAccepted: true,
          upvoteCount: true,
          createdAt: true,
          author: { select: AUTHOR_SELECT },
        },
      });

      await tx.forumPost.update({
        where: { id: post.id },
        data: { answerCount: { increment: 1 }, rewardScore: { increment: XP_ANSWER_BASE } },
      });

      // Answering is genuine engagement — counts toward the daily streak,
      // same as any other positive learning activity.
      await this.gamificationService.recordAttempt(user.sub, true, XP_ANSWER_BASE, tx);

      return { ...answer, upvotedByMe: false };
    });
  }

  async toggleUpvote(user: AuthenticatedUser, answerId: string) {
    const answer = await this.prisma.forumAnswer.findUnique({
      where: { id: answerId },
      select: { id: true, authorId: true, postId: true },
    });
    if (!answer) {
      throw apiError('ANSWER_NOT_FOUND', 'Câu trả lời không tồn tại.', HttpStatus.NOT_FOUND);
    }
    if (answer.authorId === user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Bạn không thể tự bình chọn cho câu trả lời của chính mình.',
        HttpStatus.FORBIDDEN,
      );
    }

    const existing = await this.prisma.forumAnswerUpvote.findUnique({
      where: { userId_answerId: { userId: user.sub, answerId } },
      select: { id: true },
    });

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.forumAnswerUpvote.delete({ where: { id: existing.id } });
        const updated = await tx.forumAnswer.update({
          where: { id: answerId },
          data: { upvoteCount: { decrement: 1 } },
          select: { upvoteCount: true },
        });
        await tx.forumPost.update({
          where: { id: answer.postId },
          data: { rewardScore: { decrement: XP_UPVOTE } },
        });
        // A correction, not a fresh activity — adjustXp skips streak logic.
        await this.gamificationService.adjustXp(answer.authorId, -XP_UPVOTE, tx);
        return { upvoted: false, upvoteCount: updated.upvoteCount };
      }

      await tx.forumAnswerUpvote.create({ data: { userId: user.sub, answerId } });
      const updated = await tx.forumAnswer.update({
        where: { id: answerId },
        data: { upvoteCount: { increment: 1 } },
        select: { upvoteCount: true },
      });
      await tx.forumPost.update({
        where: { id: answer.postId },
        data: { rewardScore: { increment: XP_UPVOTE } },
      });
      await this.gamificationService.recordAttempt(answer.authorId, true, XP_UPVOTE, tx);
      return { upvoted: true, upvoteCount: updated.upvoteCount };
    });
  }

  async acceptAnswer(user: AuthenticatedUser, answerId: string) {
    const answer = await this.prisma.forumAnswer.findUnique({
      where: { id: answerId },
      select: {
        id: true,
        authorId: true,
        postId: true,
        isAccepted: true,
        post: { select: { authorId: true } },
      },
    });
    if (!answer) {
      throw apiError('ANSWER_NOT_FOUND', 'Câu trả lời không tồn tại.', HttpStatus.NOT_FOUND);
    }

    const acceptorIsAsker = answer.post.authorId === user.sub;
    const authorized = acceptorIsAsker || user.role === 'teacher' || user.role === 'admin';
    if (!authorized) {
      throw apiError(
        'FORBIDDEN',
        'Chỉ người đặt câu hỏi hoặc giáo viên mới có thể đánh dấu câu trả lời là đúng.',
        HttpStatus.FORBIDDEN,
      );
    }
    // The asker accepting their own answer to their own question would farm
    // XP for free; a teacher confirming that same answer is still fine.
    if (acceptorIsAsker && answer.authorId === user.sub) {
      throw apiError(
        'FORBIDDEN',
        'Bạn không thể chấp nhận câu trả lời của chính mình cho câu hỏi của chính mình.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (answer.isAccepted) {
      return { id: answer.id, isAccepted: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.forumAnswer.updateMany({
        where: { postId: answer.postId, id: { not: answer.id } },
        data: { isAccepted: false },
      });
      await tx.forumAnswer.update({
        where: { id: answer.id },
        data: { isAccepted: true },
      });
      await tx.forumPost.update({
        where: { id: answer.postId },
        data: { hasAcceptedAnswer: true, rewardScore: { increment: XP_ACCEPTED } },
      });
      await this.gamificationService.recordAttempt(answer.authorId, true, XP_ACCEPTED, tx);
    });

    return { id: answer.id, isAccepted: true };
  }

  // --- helpers ---

  private async visibilityClause(userId: string) {
    const memberships = await this.prisma.classMember.findMany({
      where: { userId },
      select: { classId: true },
    });
    const classIds = memberships.map((m) => m.classId);
    return {
      OR: [{ classId: null }, ...(classIds.length > 0 ? [{ classId: { in: classIds } }] : [])],
    };
  }

  // topicId implies its class; a separately-passed classId is only used
  // when no topic is given. Mirrors ExercisesService.resolveTopicLink.
  private async resolveScope(
    user: AuthenticatedUser,
    topicId: string | undefined,
    classId: string | undefined,
  ): Promise<{ topicId: string | null; classId: string | null }> {
    if (topicId) {
      const topic = await this.prisma.topic.findUnique({
        where: { id: topicId },
        select: { id: true, classId: true },
      });
      if (!topic) {
        throw apiError('TOPIC_NOT_FOUND', 'Chủ đề không tồn tại.', HttpStatus.NOT_FOUND);
      }
      await this.classesService.assertMember(topic.classId, user);
      return { topicId: topic.id, classId: topic.classId };
    }
    if (classId) {
      await this.classesService.assertMember(classId, user);
      return { topicId: null, classId };
    }
    return { topicId: null, classId: null };
  }

  private async assertNotRateLimited(
    userId: string,
    kind: 'post' | 'answer' = 'post',
  ): Promise<void> {
    const cooldownMs = kind === 'post' ? POST_COOLDOWN_MS : ANSWER_COOLDOWN_MS;
    const last =
      kind === 'post'
        ? await this.prisma.forumPost.findFirst({
            where: { authorId: userId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          })
        : await this.prisma.forumAnswer.findFirst({
            where: { authorId: userId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });

    if (last && Date.now() - last.createdAt.getTime() < cooldownMs) {
      const waitSeconds = Math.ceil(
        (cooldownMs - (Date.now() - last.createdAt.getTime())) / 1000,
      );
      throw apiError(
        'RATE_LIMITED',
        `Bạn đang đăng bài quá nhanh — vui lòng đợi ${waitSeconds} giây rồi thử lại.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
