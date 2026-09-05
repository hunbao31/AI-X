import { GoneException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/roles.decorator';
import { ExercisesController } from './exercises.controller';

describe('ExercisesController retired/list and detail policy', () => {
  const service: any = { findOne: jest.fn() };
  const teacher = { sub: 'teacher', username: 'teacher', email: null, role: 'teacher' as const };
  const controller = new ExercisesController(service);

  beforeEach(() => jest.resetAllMocks());

  it('retires GET /exercises with 410 Gone', () => {
    expect(() => controller.findAll()).toThrow(GoneException);
    try { controller.findAll(); } catch (error) { expect((error as GoneException).getStatus()).toBe(410); }
  });

  it('marks GET /:id as teacher-only, so RolesGuard rejects students', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ExercisesController.prototype.findOne)).toEqual(['teacher']);
  });

  it('allows the teacher handler to resolve an exercise without a 403', async () => {
    service.findOne.mockResolvedValue({ id: 'exercise-1' });
    await expect(controller.findOne('exercise-1', { user: teacher })).resolves.toMatchObject({ success: true, data: { id: 'exercise-1' } });
  });
});
