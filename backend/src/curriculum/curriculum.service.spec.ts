import { CurriculumService } from './curriculum.service';

describe('CurriculumService public projection', () => {
  it('returns only public curriculum fields and never correctAnswer', () => {
    const data = new CurriculumService().getAllGrades();
    expect(JSON.stringify(data)).not.toContain('correctAnswer');
    for (const grade of data) {
      expect(Object.keys(grade).sort()).toEqual(['id', 'name', 'topics']);
      for (const topic of grade.topics) {
        expect(Object.keys(topic).sort()).toEqual(['exercises', 'id', 'name']);
        for (const exercise of topic.exercises) {
          expect(Object.keys(exercise).sort()).toEqual(['id', 'question']);
        }
      }
    }
  });
});
