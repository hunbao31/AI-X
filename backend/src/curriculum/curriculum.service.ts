import { Injectable } from '@nestjs/common';
import {
  GRADES,
  CurriculumGrade,
  CurriculumTopic,
  CurriculumExercise,
} from './curriculum.data';

@Injectable()
export class CurriculumService {
  getAllGrades(): CurriculumGrade[] {
    return GRADES;
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
