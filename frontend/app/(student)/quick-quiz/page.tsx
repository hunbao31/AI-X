'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { McqOptions } from '@/components/exercise/McqOptions';
import { MathText } from '@/components/ui/MathText';
import { XPCounter } from '@/components/ui/XPCounter';
import { useSounds } from '@/lib/sounds';
import { questionSlide, staggerContainer, fadeSlideUp, popIn, springGentle } from '@/lib/animations';
import type { QuickQuiz, QuizResult } from '@/lib/types';

type Phase = 'intro' | 'playing' | 'submitting' | 'done';

// Stateless "Start Random Quiz": the server picks a random topic and
// difficulty-scaled random questions. Graded in one submit at the end.
export default function QuickQuizPage() {
  const { playClick, playWhoosh, playCorrect, playWrong } = useSounds();

  const [phase, setPhase] = useState<Phase>('intro');
  const [quiz, setQuiz] = useState<QuickQuiz | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState('');
  const answersRef = useRef<Map<string, { answer: string; timeMs: number }>>(new Map());
  const questionStartRef = useRef(Date.now());

  const questions = quiz?.questions ?? [];
  const current = questions[index] ?? null;

  async function handleStart() {
    playClick();
    setError('');
    try {
      const generated = await apiPost<QuickQuiz>('/api/v1/sets/quick-start', {});
      if (generated.questions.length === 0) {
        setError('Chưa có câu hỏi nào.');
        return;
      }
      setQuiz(generated);
      answersRef.current = new Map();
      setIndex(0);
      setResult(null);
      questionStartRef.current = Date.now();
      setPhase('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu trắc nghiệm nhanh.');
    }
  }

  const submitAll = useCallback(async () => {
    setPhase('submitting');
    try {
      const quizResult = await apiPost<QuizResult>('/api/v1/sets/quick-start/submit', {
        answers: [...answersRef.current.entries()].map(([exerciseId, entry]) => ({
          exerciseId,
          answer: entry.answer,
          timeMs: entry.timeMs,
        })),
      });
      setResult(quizResult);
      if (quizResult.correctCount >= quizResult.totalCount / 2) playCorrect();
      else playWrong();
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nộp bài.');
      setPhase('playing');
    }
  }, [playCorrect, playWrong]);

  function advance() {
    if (!current) return;
    const answer = current.type === 'mcq' ? (selectedOption ?? '') : textAnswer;
    answersRef.current.set(current.exerciseId, {
      answer,
      timeMs: Date.now() - questionStartRef.current,
    });
    setSelectedOption(null);
    setTextAnswer('');
    questionStartRef.current = Date.now();

    if (index + 1 >= questions.length) {
      void submitAll();
    } else {
      playWhoosh();
      setIndex((i) => i + 1);
    }
  }

  if (phase === 'intro') {
    return (
      <motion.div variants={popIn} initial="hidden" animate="show" className="mx-auto max-w-2xl">
        <Card className="space-y-4 text-center">
          <p className="text-5xl">🎲</p>
          <h1 className="text-2xl font-bold text-white">Trắc nghiệm nhanh</h1>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button onClick={handleStart} className="w-full">
            Bắt đầu trắc nghiệm ngẫu nhiên
          </Button>
        </Card>
      </motion.div>
    );
  }

  if (phase === 'done' && result) {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-2xl space-y-6"
      >
        <motion.div variants={fadeSlideUp}>
          <Card className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-white">
              {quiz?.topic}: {result.correctCount}/{result.totalCount}
            </h1>
            <XPCounter gained={result.xpGained} />
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={handleStart}>
                Làm bài khác
              </Button>
              <Link href="/dashboard">
                <Button variant="ghost">Trang tổng quan</Button>
              </Link>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeSlideUp}>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Xem lại</h2>
            {result.results.map((r, i) => {
              const question = questions.find((q) => q.exerciseId === r.exerciseId);
              return (
                <div
                  key={r.exerciseId}
                  className={`rounded-xl border p-3 ${
                    r.correct
                      ? 'border-green-400/30 bg-green-500/10'
                      : 'border-red-400/30 bg-red-500/10'
                  }`}
                >
                  <p className="text-sm font-medium text-white">
                    {r.correct ? '✅' : '❌'} {i + 1}.{' '}
                    <MathText text={question?.question ?? ''} />
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Câu trả lời của bạn:{' '}
                    <MathText
                      text={r.yourAnswer || '(chưa trả lời)'}
                      className={r.correct ? 'text-green-300' : 'text-red-300'}
                    />
                    {!r.correct && r.correctAnswer !== null && (
                      <>
                        {' · Đáp án: '}
                        <MathText text={r.correctAnswer} className="text-green-300" />
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  const progress = questions.length > 0 ? (index / questions.length) * 100 : 0;
  const hasAnswer =
    current?.type === 'mcq' ? selectedOption !== null : textAnswer.trim() !== '';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          {quiz?.topic} · Câu {index + 1}/{questions.length}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={springGentle}
          className="h-full w-full origin-left rounded-full bg-gradient-to-r from-indigo-400 to-purple-500"
        />
      </div>

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.exerciseId}
            variants={questionSlide}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <Card className="space-y-5">
              <h2 className="text-xl font-semibold text-white">
                <MathText text={current.question} />
              </h2>

              {current.type === 'mcq' ? (
                <McqOptions
                  options={current.options ?? []}
                  selected={selectedOption}
                  onSelect={setSelectedOption}
                  disabled={phase === 'submitting'}
                />
              ) : (
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={phase === 'submitting'}
                  placeholder="Nhập câu trả lời…"
                  className="input-base px-4 py-3"
                />
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                onClick={advance}
                disabled={phase === 'submitting' || !hasAnswer}
                className="w-full"
              >
                {phase === 'submitting'
                  ? 'Đang nộp bài…'
                  : index + 1 >= questions.length
                    ? 'Hoàn thành'
                    : 'Tiếp theo →'}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
