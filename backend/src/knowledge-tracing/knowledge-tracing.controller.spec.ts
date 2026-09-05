import { KnowledgeTracingController } from './knowledge-tracing.controller';

const student = { sub: 'student-a', username: 'student-a', email: null, role: 'student' as const };
const teacher = { sub: 'teacher-a', username: 'teacher-a', email: null, role: 'teacher' as const };

describe('KnowledgeTracingController authorization', () => {
  const tracing: any = { predictStudent: jest.fn(), predictClass: jest.fn() };
  const classes: any = { assertTeacherOfStudent: jest.fn(), assertTeacherOf: jest.fn() };
  let controller: KnowledgeTracingController;

  beforeEach(() => {
    jest.resetAllMocks();
    tracing.predictStudent.mockResolvedValue([{ step: 1 }]);
    tracing.predictClass.mockResolvedValue([{ topic: 'S1' }]);
    controller = new KnowledgeTracingController(tracing, classes);
  });

  it('allows a student to predict only themself', async () => {
    const response = await controller.predictStudent('student-a', { interactions: [['S1', 1]] }, { user: student });
    expect(response.data).toEqual([{ step: 1 }]);
    expect(classes.assertTeacherOfStudent).not.toHaveBeenCalled();
  });

  it('rejects a student predicting another user', async () => {
    await expect(controller.predictStudent('student-b', { interactions: [['S1', 1]] }, { user: student }))
      .rejects.toMatchObject({ status: 403, response: expect.objectContaining({ error: expect.objectContaining({ code: 'FORBIDDEN' }) }) });
  });

  it('allows the teacher of the requested class report', async () => {
    const response = await controller.predictClass({ classId: 'class-a', students: [{ id: 'student-a', interactions: [['S1', 1]] }] }, { user: teacher });
    expect(classes.assertTeacherOf).toHaveBeenCalledWith('class-a', teacher);
    expect(response.data).toEqual([{ topic: 'S1' }]);
  });

  it('propagates the forbidden result for an unrelated teacher', async () => {
    classes.assertTeacherOf.mockRejectedValue({ status: 403, response: { error: { code: 'FORBIDDEN' } } });
    await expect(controller.predictClass({ classId: 'class-b', students: [{ id: 'student-a', interactions: [['S1', 1]] }] }, { user: teacher }))
      .rejects.toMatchObject({ status: 403 });
  });
});
