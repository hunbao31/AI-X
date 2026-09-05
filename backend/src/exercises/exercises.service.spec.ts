import { ExercisesService } from './exercises.service';

describe('ExercisesService topicId guard', () => {
  it('rejects creation without topicId before writing to Prisma', async () => {
    const prisma: any = { exercise: { create: jest.fn() } };
    const service = new ExercisesService(prisma);
    await expect(service.create({ question: 'Q', type: 'mcq', options: ['A', 'B'], answer: 'A', difficulty: 'easy' } as any, { sub: 't', username: 't', email: null, role: 'teacher' }))
      .rejects.toMatchObject({ status: 422 });
    expect(prisma.exercise.create).not.toHaveBeenCalled();
  });
});
