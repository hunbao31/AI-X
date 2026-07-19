import { Injectable, Logger } from '@nestjs/common';
import {
  evaluateAnswer as fallbackEvaluate,
  AiEvaluation,
  UnderstandingLevel,
} from './evaluate-answer';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-5';
const REQUEST_TIMEOUT_MS = 15_000;

const VALID_LEVELS: UnderstandingLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

function isValidEvaluation(value: unknown): value is AiEvaluation {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.correct === 'boolean' &&
    typeof v.explanation === 'string' &&
    typeof v.suggestion === 'string' &&
    typeof v.understandingLevel === 'string' &&
    VALID_LEVELS.includes(v.understandingLevel as UnderstandingLevel)
  );
}

function buildPrompt(
  question: string,
  correctAnswer: string,
  userAnswer: string,
): string {
  return `You are a math tutor evaluating a student.

Question:
${question}

Correct Answer:
${correctAnswer}

Student Answer:
${userAnswer}

Return JSON only, with no other text before or after it, in exactly this shape:
{
  "correct": boolean,
  "understandingLevel": "LOW" | "MEDIUM" | "HIGH",
  "explanation": string,
  "suggestion": string
}`;
}

function extractJson(text: string): unknown {
  // Claude may still wrap the object in prose or a code fence — pull out
  // the first {...} block rather than assuming the whole string is JSON.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON object found in AI response.');
  }
  return JSON.parse(match[0]);
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async evaluateAnswer(
    question: string,
    userAnswer: string,
    correctAnswer: string,
  ): Promise<AiEvaluation> {
    const apiKey = process.env.AI_API_KEY;

    if (!apiKey) {
      this.logger.warn('AI_API_KEY not set — using fallback evaluation.');
      return fallbackEvaluate(question, userAnswer, correctAnswer);
    }

    try {
      const rawText = await this.callClaude(
        apiKey,
        question,
        userAnswer,
        correctAnswer,
      );
      const parsed = extractJson(rawText);

      if (!isValidEvaluation(parsed)) {
        this.logger.warn(
          'AI response failed validation — using fallback evaluation.',
        );
        return fallbackEvaluate(question, userAnswer, correctAnswer);
      }

      return parsed;
    } catch (err) {
      // Network error, timeout, non-2xx status, unparseable JSON — all land
      // here. The backend must never crash or 500 because the AI call failed.
      this.logger.error(
        `AI evaluation failed (${(err as Error).message}) — using fallback evaluation.`,
      );
      return fallbackEvaluate(question, userAnswer, correctAnswer);
    }
  }

  private async callClaude(
    apiKey: string,
    question: string,
    userAnswer: string,
    correctAnswer: string,
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: buildPrompt(question, correctAnswer, userAnswer),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Anthropic API returned HTTP ${res.status}`);
      }

      const json = await res.json();
      const text = json?.content?.[0]?.text;

      if (typeof text !== 'string') {
        throw new Error('Unexpected Anthropic response shape.');
      }

      return text;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
