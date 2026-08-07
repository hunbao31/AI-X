// Shared by csv-import.ts and the quiz-builder inline question endpoint —
// one definition of "what does correctAnswer mean" so CSV rows and manually
// typed questions behave identically.

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

export interface AnswerResolution {
  answer: string | null;
  error: string | null;
}

// Accepts a letter ("B") or the exact option text; returns the resolved
// option text, or a human-readable error explaining why it didn't resolve.
export function resolveAnswerFromOptions(
  options: string[],
  correct: string,
): AnswerResolution {
  const letterIndex = ANSWER_LETTERS.indexOf(correct.toUpperCase());
  if (correct.length === 1 && letterIndex >= 0) {
    const answer = options[letterIndex];
    if (answer === undefined) {
      return { answer: null, error: `correctAnswer "${correct}" trỏ đến một lựa chọn trống.` };
    }
    return { answer, error: null };
  }

  const answer = options.find((o) => o.toLowerCase() === correct.toLowerCase());
  if (answer === undefined) {
    return {
      answer: null,
      error: 'correctAnswer phải khớp với một trong các lựa chọn (hoặc là A/B/C/D).',
    };
  }
  return { answer, error: null };
}
