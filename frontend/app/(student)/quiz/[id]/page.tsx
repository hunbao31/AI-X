'use client';

import { useCallback, useEffect, useRef, useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { McqOptions, AnswerFeedback } from '@/components/exercise/McqOptions';
import { MathText } from '@/components/ui/MathText';
import { XPCounter } from '@/components/ui/XPCounter';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import { FeedbackPopup, PopupState } from '@/components/ui/FeedbackPopup';
import { useMascot } from '@/components/mascot/MascotProvider';
import { useSounds } from '@/lib/sounds';
import { questionXp } from '@/lib/quiz-xp';
import {
  questionSlide,
  staggerContainer,
  fadeSlideUp,
  springSmooth,
  springGentle,
  popIn,
} from '@/lib/animations';
import type {
  SetDetail,
  QuizResult,
  LeaderboardEntry,
  PlayableQuestion,
  GamificationSummary,
  CheckResult,
  StartAttemptResult,
} from '@/lib/types';

type Phase = 'intro' | 'playing' | 'submitting' | 'done';

// Display-only labels for the QuizMode enum — comparisons elsewhere
// (e.g. set.mode === 'practice') keep using the original English values.
const MODE_LABEL: Record<string, string> = {
  practice: 'Luyện tập',
  exam: 'Kiểm tra',
};

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function QuizPlayerPage() {
  const params = useParams<{ id: string }>();
  const setId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') ?? undefined;
  const { playClick, playCorrect, playWrong, playWhoosh } = useSounds();
  const mascot = useMascot();

  const [set, setSet] = useState<SetDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  // Snapshot before playing — used to compute gained XP and detect level-ups.
  const [prior, setPrior] = useState<GamificationSummary | null>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [checking, setChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [totalLeft, setTotalLeft] = useState<number | null>(null);
  const [resumed, setResumed] = useState(false);

  const [result, setResult] = useState<QuizResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState('');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);

  // Answers (+ per-question answer time, the speed-bonus input) keyed by
  // exerciseId; auto-saved to the in-progress attempt and submitted at the
  // end. Grading is server-side.
  const answersRef = useRef<Map<string, { answer: string; timeMs: number }>>(
    new Map(),
  );
  const attemptIdRef = useRef<string | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const quizStartRef = useRef<number>(Date.now());
  // In-quiz combo of consecutive correct answers (mirrors the server walk).
  const comboRef = useRef(0);
  // Consecutive wrong answers — 3+ turns Koaly confused.
  const wrongStreakRef = useRef(0);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Koaly mirrors the quiz phase: pondering while a question is open,
  // relaxed otherwise.
  useEffect(() => {
    mascot.setMood(phase === 'playing' ? 'thinking' : 'idle');
    return () => mascot.setMood('idle');
  }, [phase, mascot]);

  const showPopup = useCallback((state: PopupState) => {
    setPopup(state);
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    popupTimerRef.current = setTimeout(() => setPopup(null), 950);
  }, []);

  useEffect(() => {
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    const query = code ? `?code=${encodeURIComponent(code)}` : '';
    Promise.all([
      apiGet<SetDetail>(`/api/v1/sets/${setId}${query}`),
      apiGet<GamificationSummary>('/api/v1/gamification'),
    ])
      .then(([detail, gamification]) => {
        setSet(detail);
        setPrior(gamification);
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Không thể tải bài trắc nghiệm.'),
      )
      .finally(() => setLoading(false));
  }, [setId, code]);

  const questions: PlayableQuestion[] = set?.questions ?? [];
  const current = questions[index] ?? null;
  const isPractice = set?.mode === 'practice';

  // Fire-and-forget auto-save of every recorded answer + position.
  const persistProgress = useCallback(
    (nextIndex: number) => {
      if (!attemptIdRef.current) return;
      apiPatch(`/api/v1/sets/attempts/${attemptIdRef.current}/progress`, {
        answers: [...answersRef.current.entries()].map(([exerciseId, entry]) => ({
          exerciseId,
          answer: entry.answer,
          timeMs: entry.timeMs,
        })),
        lastQuestionIndex: nextIndex,
      }).catch(() => undefined);
    },
    [],
  );

  const submitAll = useCallback(
    async (finalAnswers: Map<string, { answer: string; timeMs: number }>) => {
      setPhase('submitting');
      try {
        const quizResult = await apiPost<QuizResult>(`/api/v1/sets/${setId}/submit`, {
          answers: [...finalAnswers.entries()].map(([exerciseId, entry]) => ({
            exerciseId,
            answer: entry.answer,
            timeMs: entry.timeMs,
          })),
          attemptId: attemptIdRef.current ?? undefined,
          durationSeconds: Math.round((Date.now() - quizStartRef.current) / 1000),
          code,
        });
        attemptIdRef.current = null;
        setResult(quizResult);
        setPhase('done');
        setPrior((before) => {
          if (before && quizResult.gamification.level > before.level) {
            setShowLevelUp(true);
          }
          return before;
        });
        // Koaly's verdict on the run: strong score → party, otherwise a pep
        // talk (never negative on the results screen).
        if (quizResult.totalCount > 0) {
          if (quizResult.correctCount / quizResult.totalCount >= 0.7) {
            mascot.react(
              'celebrate',
              `${quizResult.correctCount}/${quizResult.totalCount}! 🎉`,
            );
          } else {
            mascot.react('encourage');
          }
        }
        apiGet<LeaderboardEntry[]>(
          `/api/v1/sets/${setId}/leaderboard${code ? `?code=${encodeURIComponent(code)}` : ''}`,
        )
          .then(setLeaderboard)
          .catch(() => setLeaderboard([]));
        apiGet<string[]>('/api/v1/favorites/ids')
          .then((ids) => setFavoriteIds(new Set(ids)))
          .catch(() => undefined);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : 'Không thể nộp bài trắc nghiệm.',
        );
        setPhase('playing');
      }
    },
    [setId, code, mascot],
  );

  // Saves the current answer (possibly empty on timeout) and moves on. In
  // practice mode the answer was already recorded at check time.
  const advance = useCallback(() => {
    if (!current) return;
    if (!answersRef.current.has(current.exerciseId)) {
      const answer = current.type === 'mcq' ? (selectedOption ?? '') : textAnswer;
      answersRef.current.set(current.exerciseId, {
        answer,
        timeMs: Date.now() - questionStartRef.current,
      });
    }
    setSelectedOption(null);
    setTextAnswer('');
    setFeedback(null);

    if (index + 1 >= questions.length) {
      void submitAll(answersRef.current);
    } else {
      playWhoosh();
      persistProgress(index + 1);
      setIndex((i) => i + 1);
    }
  }, [
    current,
    selectedOption,
    textAnswer,
    index,
    questions.length,
    submitAll,
    playWhoosh,
    persistProgress,
  ]);

  // Total-quiz-timer expiry: record whatever is on screen and submit.
  const finishNow = useCallback(() => {
    if (current && !answersRef.current.has(current.exerciseId)) {
      const answer = current.type === 'mcq' ? (selectedOption ?? '') : textAnswer;
      answersRef.current.set(current.exerciseId, {
        answer,
        timeMs: Date.now() - questionStartRef.current,
      });
    }
    void submitAll(answersRef.current);
  }, [current, selectedOption, textAnswer, submitAll]);

  // Practice mode: grade one answer server-side, animate + sound the result,
  // and flash the center popup with the projected XP.
  const runCheck = useCallback(
    async (answer: string) => {
      if (!current || feedback !== null || checking) return;
      const timeMs = Date.now() - questionStartRef.current;
      setChecking(true);
      try {
        const check = await apiPost<CheckResult>(`/api/v1/sets/${setId}/check`, {
          exerciseId: current.exerciseId,
          answer,
          code,
        });
        answersRef.current.set(current.exerciseId, { answer, timeMs });
        persistProgress(index);
        comboRef.current = check.correct ? comboRef.current + 1 : 0;
        wrongStreakRef.current = check.correct ? 0 : wrongStreakRef.current + 1;
        const limit = set?.timeLimitPerQuestion ?? null;
        const projectedXp = check.correct
          ? questionXp(true, comboRef.current, timeMs, limit)
          : null;
        setFeedback({
          selected: answer,
          correct: check.correct,
          correctAnswer: check.correctAnswer,
        });
        showPopup({
          correct: check.correct,
          xp: projectedXp,
          combo: comboRef.current,
        });
        if (check.correct) playCorrect();
        else playWrong();

        // Koaly reacts in sync with the sound: combo → fired up, fast
        // answer → proud, plain correct → happy (+XP bubble), 3 misses in a
        // row → confused, otherwise a quick "Oops!".
        if (check.correct) {
          if (comboRef.current >= 3) {
            mascot.react('streak', `${comboRef.current} liên tiếp! 🔥`);
          } else if (limit !== null && timeMs < limit * 1000 * 0.35) {
            mascot.react('fastCorrect');
          } else {
            mascot.react('correct', projectedXp !== null ? `+${projectedXp} XP` : undefined);
          }
        } else if (wrongStreakRef.current >= 3) {
          mascot.react('confusedRun');
        } else {
          mascot.react('wrong');
        }
      } catch {
        answersRef.current.set(current.exerciseId, { answer, timeMs });
        setFeedback({ selected: answer, correct: false, correctAnswer: null });
      } finally {
        setChecking(false);
      }
    },
    [
      current,
      feedback,
      checking,
      setId,
      code,
      index,
      set?.timeLimitPerQuestion,
      persistProgress,
      mascot,
      showPopup,
      playCorrect,
      playWrong,
    ],
  );

  const advanceRef = useRef(advance);
  const runCheckRef = useRef(runCheck);
  const finishNowRef = useRef(finishNow);
  useEffect(() => {
    advanceRef.current = advance;
    runCheckRef.current = runCheck;
    finishNowRef.current = finishNow;
  }, [advance, runCheck, finishNow]);

  // Per-question clock reset...
  useEffect(() => {
    if (phase !== 'playing') return;
    setSecondsLeft(set?.timeLimitPerQuestion ?? null);
    questionStartRef.current = Date.now();
  }, [phase, index, set?.timeLimitPerQuestion]);

  // ...ticking only while unanswered.
  const answered = feedback !== null;
  useEffect(() => {
    if (phase !== 'playing' || !set?.timeLimitPerQuestion || answered) return;

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null) return null;
        if (s <= 1) {
          clearInterval(interval);
          if (set.mode === 'practice') {
            void runCheckRef.current('');
          } else {
            advanceRef.current();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, index, set?.timeLimitPerQuestion, set?.mode, answered]);

  // Full-quiz countdown → auto submit at zero.
  useEffect(() => {
    if (phase !== 'playing' || !set?.totalTimeLimit) return;

    const interval = setInterval(() => {
      setTotalLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          clearInterval(interval);
          finishNowRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, set?.totalTimeLimit]);

  async function handleStart() {
    playClick();
    setSubmitError('');
    try {
      // Creates or resumes the in-progress attempt; auto-save hangs off it.
      const started = await apiPost<StartAttemptResult>(`/api/v1/sets/${setId}/start`, {
        code,
      });
      attemptIdRef.current = started.attemptId;
      answersRef.current = new Map(
        started.answers.map((a) => [a.exerciseId, { answer: a.answer, timeMs: a.timeMs ?? 0 }]),
      );
      const resumeIndex =
        started.lastQuestionIndex > 0 && started.lastQuestionIndex < questions.length
          ? started.lastQuestionIndex
          : 0;
      setResumed(resumeIndex > 0);
      setIndex(resumeIndex);
    } catch {
      // Start endpoint unavailable → play statelessly (no resume).
      attemptIdRef.current = null;
      answersRef.current = new Map();
      setIndex(0);
    }
    comboRef.current = 0;
    quizStartRef.current = Date.now();
    questionStartRef.current = Date.now();
    setTotalLeft(set?.totalTimeLimit ?? null);
    setPopup(null);
    setResult(null);
    setFeedback(null);
    setSelectedOption(null);
    setTextAnswer('');
    setPhase('playing');
  }

  function handleOptionSelect(option: string) {
    setSelectedOption(option);
    if (isPractice) void runCheck(option);
  }

  function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    if (!codeInput.trim()) return;
    router.push(`/quiz/${setId}?code=${encodeURIComponent(codeInput.trim())}`);
  }

  async function toggleFavorite(exerciseId: string) {
    const next = new Set(favoriteIds);
    if (next.has(exerciseId)) {
      next.delete(exerciseId);
      setFavoriteIds(next);
      await apiDelete(`/api/v1/favorites/${exerciseId}`).catch(() => undefined);
    } else {
      next.add(exerciseId);
      setFavoriteIds(next);
      await apiPost(`/api/v1/favorites/${exerciseId}`, {}).catch(() => undefined);
    }
  }

  if (loading) return <p className="text-center text-slate-400">Đang tải bài trắc nghiệm…</p>;

  if (loadError || !set) {
    return (
      <Card className="mx-auto max-w-2xl space-y-4">
        <p className="text-red-400">{loadError || 'Không tìm thấy bài trắc nghiệm.'}</p>
        <form onSubmit={handleCodeSubmit} className="flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Bạn có mã truy cập? Nhập vào đây"
            className="input-base flex-1"
          />
          <Button type="submit" variant="secondary">
            Mở khóa
          </Button>
        </form>
        <Link
          href="/quizzes"
          className="inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Quay lại danh sách trắc nghiệm
        </Link>
      </Card>
    );
  }

  // --- Intro: nothing starts until the student presses Start ---
  if (phase === 'intro') {
    return (
      <motion.div
        variants={popIn}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-2xl space-y-6"
      >
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-white">{set.title}</h1>
            <div className="flex gap-2">
              <Badge tone={set.mode === 'exam' ? 'red' : 'green'}>{MODE_LABEL[set.mode] ?? set.mode}</Badge>
              {set.isPublic ? (
                <Badge tone="green">công khai</Badge>
              ) : set.class ? (
                <Badge tone="indigo">{set.class.name}</Badge>
              ) : set.hasAccessCode ? (
                <Badge tone="yellow">cần mã</Badge>
              ) : null}
            </div>
          </div>
          {set.description && <p className="text-sm text-slate-300">{set.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span>📋 {set.questionCount} câu hỏi</span>
            <span>
              {set.timeLimitPerQuestion
                ? `⏱️ ${set.timeLimitPerQuestion} giây mỗi câu`
                : '⏱️ không giới hạn thời gian'}
            </span>
            {set.totalTimeLimit && <span>⌛ tổng {formatSeconds(set.totalTimeLimit)}</span>}
            {(set.shuffleQuestions || set.shuffleAnswers) && <span>🔀 đã trộn</span>}
            <span>👤 bởi {set.creator.username}</span>
          </div>
          {set.mode === 'exam' && (
            <p className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-300">
              Chế độ kiểm tra: không có phản hồi khi làm bài, và đáp án đúng
              sẽ được ẩn sau khi nộp bài.
            </p>
          )}
          {set.questionCount === 0 ? (
            <p className="text-sm text-slate-400">
              Bài trắc nghiệm này chưa có câu hỏi nào — hãy quay lại sau.
            </p>
          ) : (
            <Button onClick={handleStart} className="w-full">
              Bắt đầu trắc nghiệm
            </Button>
          )}
        </Card>
      </motion.div>
    );
  }

  // --- Results ---
  if (phase === 'done' && result) {
    const gainedXp =
      result.xpGained ??
      (prior ? Math.max(0, result.gamification.xp - prior.xp) : result.correctCount * 10);

    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-2xl space-y-6"
      >
        <AnimatePresence>
          {showLevelUp && (
            <LevelUpOverlay
              level={result.gamification.level}
              onClose={() => setShowLevelUp(false)}
            />
          )}
        </AnimatePresence>

        <motion.div variants={fadeSlideUp}>
          <Card className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-white">Hoàn thành bài trắc nghiệm!</h1>
            <p className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-5xl font-bold text-transparent">
              {result.score}
            </p>
            <p className="text-sm text-slate-400">
              {result.correctCount}/{result.totalCount} đúng · Cấp độ{' '}
              {result.gamification.level} · 🔥 Chuỗi {result.gamification.streak} ngày
            </p>
            <XPCounter gained={gainedXp} />
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={handleStart}>
                Làm lại
              </Button>
              <Link href="/quizzes">
                <Button variant="ghost">Tất cả trắc nghiệm</Button>
              </Link>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeSlideUp}>
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Xem lại</h2>
              {set.mode === 'exam' && (
                <span className="text-xs text-slate-500">
                  Đáp án được ẩn (chế độ kiểm tra)
                </span>
              )}
            </div>
            {result.results.map((r, i) => {
              const question = questions.find((q) => q.exerciseId === r.exerciseId);
              const isFavorite = favoriteIds.has(r.exerciseId);
              return (
                <div
                  key={r.exerciseId}
                  className={`rounded-xl border p-3 ${
                    r.correct
                      ? 'border-green-400/30 bg-green-500/10'
                      : 'border-red-400/30 bg-red-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      {r.correct ? '✅' : '❌'} {i + 1}.{' '}
                      <MathText text={question?.question ?? 'Câu hỏi'} />
                      {r.correct && (
                        <span className="ml-2 text-xs font-semibold text-amber-300">
                          +{r.xpEarned} XP
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(r.exerciseId)}
                      title={isFavorite ? 'Bỏ lưu' : 'Lưu câu hỏi'}
                      className="shrink-0 text-lg transition-transform hover:scale-125"
                    >
                      {isFavorite ? '⭐' : '☆'}
                    </button>
                  </div>
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

        {leaderboard.length > 0 && (
          <motion.div variants={fadeSlideUp}>
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-white">🏆 Bảng xếp hạng</h2>
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-200">
                      <span className="w-7 shrink-0 font-bold text-white">
                        #{entry.rank}
                      </span>
                      <Avatar id={entry.avatar} size={26} />
                      <span className="truncate">{entry.username}</span>
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {entry.score}{' '}
                      <span className="font-normal text-slate-400">
                        ({entry.correctCount}/{entry.totalCount})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // --- Playing / submitting ---
  const progress = questions.length > 0 ? (index / questions.length) * 100 : 0;
  const hasAnswer =
    current?.type === 'mcq' ? selectedOption !== null : textAnswer.trim() !== '';
  const canAdvance = isPractice ? feedback !== null : hasAnswer;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FeedbackPopup popup={popup} />

      <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
        <span>
          Câu {index + 1}/{questions.length}
          {resumed && index > 0 && (
            <span className="ml-2 text-xs text-indigo-300">đã tiếp tục</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {totalLeft !== null && (
            <span
              className={`rounded-full border px-3 py-1 font-semibold ${
                totalLeft <= 30
                  ? 'border-red-400/40 bg-red-500/10 text-red-300'
                  : 'border-white/15 bg-white/5 text-slate-200'
              }`}
            >
              ⌛ {formatSeconds(totalLeft)}
            </span>
          )}
          {secondsLeft !== null && (
            <motion.span
              animate={{ scale: secondsLeft <= 5 && !answered ? 1.12 : 1 }}
              transition={springSmooth}
              className={`rounded-full border px-3 py-1 font-semibold ${
                secondsLeft <= 5 && !answered
                  ? 'border-red-400/40 bg-red-500/10 text-red-300'
                  : 'border-white/15 bg-white/5 text-slate-200'
              }`}
            >
              ⏱️ {secondsLeft} giây
            </motion.span>
          )}
        </span>
      </div>

      {/* scaleX (transform-only) instead of width — no layout work per frame */}
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
                  onSelect={handleOptionSelect}
                  disabled={phase === 'submitting' || checking}
                  feedback={feedback}
                />
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    disabled={phase === 'submitting' || feedback !== null}
                    placeholder="Nhập câu trả lời…"
                    className="input-base px-4 py-3"
                  />
                  {isPractice && feedback === null && (
                    <Button
                      variant="secondary"
                      onClick={() => void runCheck(textAnswer)}
                      disabled={!hasAnswer || checking}
                    >
                      {checking ? 'Đang kiểm tra…' : 'Kiểm tra đáp án'}
                    </Button>
                  )}
                  {feedback !== null && (
                    <motion.div
                      variants={popIn}
                      initial="hidden"
                      animate="show"
                      className={`rounded-xl border p-3 text-sm ${
                        feedback.correct
                          ? 'border-green-400/40 bg-green-500/10 text-green-300'
                          : 'border-red-400/40 bg-red-500/10 text-red-300'
                      }`}
                    >
                      {feedback.correct ? 'Chính xác! 🎉' : 'Chưa đúng.'}
                      {!feedback.correct && feedback.correctAnswer !== null && (
                        <span className="ml-1 text-slate-300">
                          Đáp án:{' '}
                          <MathText
                            text={feedback.correctAnswer}
                            className="font-semibold text-green-300"
                          />
                        </span>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {submitError && <p className="text-sm text-red-400">{submitError}</p>}

              <Button
                onClick={() => advance()}
                disabled={phase === 'submitting' || checking || !canAdvance}
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
