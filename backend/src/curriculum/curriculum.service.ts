import { Injectable } from '@nestjs/common';
import {
  GRADES,
  CurriculumGrade,
  CurriculumTopic,
  CurriculumExercise,
} from './curriculum.data';

@Injectable()
export class CurriculumService {
  // Curriculum exercises contain correctAnswer for server-side/internal use.
  // The browsing endpoint must never expose it to a learner.
  getAllGrades(): Array<Omit<CurriculumGrade, 'topics'> & {
    topics: Array<Omit<CurriculumTopic, 'exercises'> & {
      exercises: Array<Pick<CurriculumExercise, 'id' | 'question'>>;
    }>;
  }> {
    return GRADES.map((grade) => ({
      ...grade,
      topics: grade.topics.map((topic) => ({
        ...topic,
        exercises: topic.exercises.map(({ id, question }) => ({ id, question })),
      })),
    }));
  }

  findTopic(topicId: string): CurriculumTopic | undefined {
    for (const grade of GRADES) {
      const topic = grade.topics.find((t) => t.id === topicId);
      if (topic) return topic;
    }
    return undefined;
  }

  findExercisesByTopic(topicId: string): CurriculumExercise[] | undefined {
    return this.findTopic(topicId)?.exercises;
  }

  findExercise(
    topicId: string,
    exerciseId: string,
  ): CurriculumExercise | undefined {
    return this.findTopic(topicId)?.exercises.find((e) => e.id === exerciseId);
  }
}
