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
      explanation: 'Correct reasoning.',
      suggestion: 'Try harder problems.',
    };
  }

  return {
    correct: false,
    understandingLevel: 'LOW',
    explanation: 'You misunderstood basic algebra.',
    suggestion: 'Review solving linear equations.',
  };
}
