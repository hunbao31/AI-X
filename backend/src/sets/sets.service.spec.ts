import { SetsService } from './sets.service';

const user = { sub: 'student-1', username: 'student', email: null, role: 'student' as const };
const mcq = { id: 'mcq', type: 'mcq', answer: 'A', topic: 'T', topicId: 'topic', difficulty: 'easy', options: ['A', 'B'] };
const text = { id: 'text', type: 'text', answer: 'Secret essay answer', topic: 'T', topicId: 'topic', difficulty: 'easy', options: null };

describe('SetsService essay review boundary', () => {
  const prisma: any = {
    exerciseSet: { findUnique: jest.fn() },
    quizAttempt: { create: jest.fn() },
    exercise: { findMany: jest.fn() },
  };
  const analytics: any = { recordAttempt: jest.fn(), recordPendingAttempt: jest.fn() };
  const mastery: any = { recordAttempt: jest.fn() };
  const gamification: any = { recordAttempt: jest.fn(), getSummary: jest.fn() };
  let service: SetsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.quizAttempt.create.mockResolvedValue({ id: 'attempt-1' });
    gamification.getSummary.mockResolvedValue({ xp: 10, level: 0, streak: 1 });
    service = new SetsService(prisma, {} as any, mastery, analytics, gamification, {} as any);
  });

  it('submit grades MCQ immediately but sends text to teacher review without its answer key', async () => {
    prisma.exerciseSet.findUnique.mockResolvedValue({ id: 'set', isPublic: true, createdBy: 'teacher', classId: null, accessCode: null, mode: 'practice', timeLimitPerQuestion: null, items: [{ exerciseId: 'mcq', exercise: mcq }, { exerciseId: 'text', exercise: text }] });
    const result = await service.submit('set', user, { answers: [{ exerciseId: 'mcq', answer: 'A' }, { exerciseId: 'text', answer: 'Essay' }] });
    expect(result.results[0]).toMatchObject({ correct: true, correctAnswer: 'A' });
    expect(result.results[1]).toEqual(expect.objectContaining({ correct: null, needsTeacherReview: true }));
    expect(result.results[1]).not.toHaveProperty('correctAnswer');
    expect(analytics.recordPendingAttempt).toHaveBeenCalledWith('student-1', 'text', 'T', 'Essay');
  });

  it('quickSubmit follows the same MCQ/text boundary', async () => {
    prisma.exercise.findMany.mockResolvedValue([mcq, text]);
    const result = await service.quickSubmit(user, { answers: [{ exerciseId: 'mcq', answer: 'A' }, { exerciseId: 'text', answer: 'Essay' }] });
    expect(result.results[0]).toMatchObject({ correct: true, correctAnswer: 'A' });
    expect(result.results[1]).toEqual(expect.objectContaining({ correct: null, needsTeacherReview: true }));
    expect(result.results[1]).not.toHaveProperty('correctAnswer');
    expect(analytics.recordPendingAttempt).toHaveBeenCalledWith('student-1', 'text', 'T', 'Essay');
  });
});
