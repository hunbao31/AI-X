import { HttpException } from '@nestjs/common';
import { DiagnosticService } from './diagnostic.service';

const teacher = { sub: 'teacher-1', username: 'teacher', email: null, role: 'teacher' as const };
const student = { sub: 'student-1', username: 'student', email: null, role: 'student' as const };

describe('DiagnosticService class boundary', () => {
  const prisma: any = {
    diagnosticExercise: { findUnique: jest.fn(), create: jest.fn() },
    diagnosticAttempt: { create: jest.fn() },
    skillCatalog: { findUnique: jest.fn() },
  };
  const classes: any = { assertMember: jest.fn(), assertTeacherOf: jest.fn() };
  const kt: any = {};
  const phobert: any = { computeSimilarity: jest.fn() };
  let service: DiagnosticService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new DiagnosticService(prisma, classes, kt, phobert);
  });

  it('requires classId and verifies teacher before creating an exercise', async () => {
    await expect(service.createExercise({ skillCode: 'S1', difficulty: 'de', question: 'Q', options: ['A', 'B'], answer: 'A' } as any, teacher))
      .rejects.toMatchObject({ status: 422 });
    prisma.skillCatalog.findUnique.mockResolvedValue({ skillCode: 'S1' });
    prisma.diagnosticExercise.create.mockResolvedValue({ id: 'new', classId: 'class-1' });
    await expect(service.createExercise({ classId: 'class-1', skillCode: 'S1', difficulty: 'de', question: 'Q', options: ['A', 'B'], answer: 'A' } as any, teacher)).resolves.toMatchObject({ classId: 'class-1' });
    expect(classes.assertTeacherOf).toHaveBeenCalledWith('class-1', teacher);
  });

  it('rejects a missing classId before creating a DiagnosticExercise', async () => {
    await expect(service.createExercise({ skillCode: 'S1', difficulty: 'de', question: 'Q', options: ['A', 'B'], answer: 'A' } as any, teacher))
      .rejects.toMatchObject({ status: 422 });
    expect(prisma.diagnosticExercise.create).not.toHaveBeenCalled();
  });

  it('copies classId and grades MCQ immediately', async () => {
    prisma.diagnosticExercise.findUnique.mockResolvedValue({ id: 'exercise-1', classId: 'class-1', skillCode: 'S1', answerType: 'mcq', answer: 'A' });
    await expect(service.submitAnswer({ classId: 'class-1', exerciseId: 'exercise-1', answer: 'A' }, student)).resolves.toEqual({ correct: true, correctAnswer: 'A' });
    expect(classes.assertMember).toHaveBeenCalledWith('class-1', student);
    expect(prisma.diagnosticAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ classId: 'class-1', correct: true }) }));
  });

  it('blocks a member from submitting an exercise belonging to another class', async () => {
    prisma.diagnosticExercise.findUnique.mockResolvedValue({ id: 'exercise-1', classId: 'class-other', skillCode: 'S1', answerType: 'mcq', answer: 'A' });
    await expect(service.submitAnswer({ classId: 'class-1', exerciseId: 'exercise-1', answer: 'A' }, student))
      .rejects.toMatchObject({ status: 403, response: expect.objectContaining({ error: expect.objectContaining({ code: 'CLASS_EXERCISE_MISMATCH' }) }) });
    expect(prisma.diagnosticAttempt.create).not.toHaveBeenCalled();
  });

  it('creates essay attempts pending review with the chosen classId', async () => {
    prisma.diagnosticExercise.findUnique.mockResolvedValue({ id: 'essay-1', classId: 'class-1', skillCode: 'S1', answerType: 'tu_luan', dapAnMau: 'Mẫu' });
    phobert.computeSimilarity.mockResolvedValue({ similarity_score: 0.7 });
    await expect(service.submitAnswer({ classId: 'class-1', exerciseId: 'essay-1', answer: 'Bài làm' }, student))
      .resolves.toEqual({ correct: null, needsTeacherReview: true });
    expect(prisma.diagnosticAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ classId: 'class-1', correct: null, needsTeacherReview: true }) }));
  });
});
