export type UnderstandingLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AiEvaluation {
  correct: boolean;
  understandingLevel: UnderstandingLevel;
  explanation: string;
  suggestion: string;
}

// FALLBACK — used by AiService when the real Anthropic call fails, times
// out, or returns something that doesn't validate. Kept as a plain function
// (no network, can't fail) so there's always a safe result to return.
export function evaluateAnswer(
  question: string,
  userAnswer: string,
  correctAnswer: string,
): AiEvaluation {
  const correct =
    userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  if (correct) {
    return {
      correct: true,
      understandingLevel: 'HIGH',
      explanation: 'Lập luận chính xác.',
      suggestion: 'Hãy thử sức với các bài khó hơn.',
    };
  }

  return {
    correct: false,
    understandingLevel: 'LOW',
    explanation: 'Bạn đã hiểu sai kiến thức đại số cơ bản.',
    suggestion: 'Hãy ôn lại cách giải phương trình bậc nhất.',
  };
}
