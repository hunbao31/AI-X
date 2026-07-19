'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DifficultyBadge } from '@/components/exercise/DifficultyBadge';
import { McqOptions } from '@/components/exercise/McqOptions';
import { FeedbackCard } from '@/components/exercise/FeedbackCard';
import { useClickSound } from '@/lib/useClickSound';

interface Exercise {
  id: string;
  question: string;
  type: 'mcq' | 'text';
  options: string[] | null;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

interface AttemptResult {
  correct: boolean;
  understandingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  suggestion: string;
  mastery: { score: number; attempts: number };
  recommendation: { message: string; nextAction: string };
  gamification: { xp: number; level: number; streak: number };
}

// Required verbatim on this page — do not edit, translate, or remove.
function StudentPageQuote() {
  return (
    <p className="animate-fade-in bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-center font-serif italic leading-snug text-transparent drop-shadow-[0_0_18px_rgba(168,85,247,0.35)]">
      &ldquo;The smallest difference between people is intelligence. The biggest
      difference is perseverance.&rdquo;
    </p>
  );
}

export default function PracticePage() {
  const playClick = useClickSound();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Gates the whole practice flow: topics are known as soon as the list
  // loads, but nothing exercise-related renders until the student picks a
  // topic AND presses Start.
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<Exercise[]>('/api/v1/exercises')
      .then(setExercises)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Failed to load topics.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const topics = useMemo(() => [...new Set(exercises.map((e) => e.topic))], [exercises]);
  const topicExercises = useMemo(
    () => exercises.filter((e) => e.topic === selectedTopic),
    [exercises, selectedTopic],
  );
  const current = topicExercises[index] ?? null;

  function handleStart() {
    if (!selectedTopic) return;
    playClick();
    setIndex(0);
    setResult(null);
    setSelectedOption(null);
    setTextAnswer('');
    setSubmitError('');
    setStarted(true);
  }

  function changeTopic() {
    playClick();
    setStarted(false);
    setSelectedTopic(null);
  }

  function goToNext() {
    setResult(null);
    setSelectedOption(null);
    setTextAnswer('');
    setIndex((i) => (i + 1) % Math.max(topicExercises.length, 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    const answer = current.type === 'mcq' ? selectedOption : textAnswer;
    if (!answer) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const attemptResult = await apiPost<AttemptResult>('/api/v1/attempts', {
        exerciseId: current.id,
        topic: current.topic,
        answer,
      });
      setResult(attemptResult);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <StudentPageQuote />

      {loading ? (
        <p className="text-center text-slate-400">Loading topics…</p>
      ) : loadError ? (
        <Card>
          <p className="text-red-400">{loadError}</p>
        </Card>
      ) : exercises.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            No exercises yet — create one from the Teacher dashboard first.
          </p>
        </Card>
      ) : !started ? (
        // --- Selection phase: pick a topic, then explicitly press Start.
        // No exercise content is fetched or shown until this happens.
        <Card className="space-y-5">
          <h1 className="text-xl font-semibold text-white">Choose a topic to practice</h1>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <motion.button
                key={t}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedTopic(t);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors duration-200 ${
                  t === selectedTopic
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {t}
              </motion.button>
            ))}
          </div>
          <Button onClick={handleStart} disabled={!selectedTopic} className="w-full">
            Start
          </Button>
        </Card>
      ) : !current ? (
        <Card className="space-y-4">
          <p className="text-slate-300">No exercises in this topic.</p>
          <Button variant="secondary" onClick={changeTopic}>
            ← Choose another topic
          </Button>
        </Card>
      ) : (
        // --- Practicing phase: only reachable after Start.
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={changeTopic}
              className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
            >
              ← {current.topic}
            </button>
            <DifficultyBadge difficulty={current.difficulty} />
          </div>

          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold text-white">{current.question}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {current.type === 'mcq' ? (
                <McqOptions
                  options={current.options ?? []}
                  selected={selectedOption}
                  onSelect={setSelectedOption}
                  disabled={!!result || submitting}
                />
              ) : (
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={!!result || submitting}
                  placeholder="Type your answer…"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60"
                />
              )}

              {submitError && <p className="text-sm text-red-400">{submitError}</p>}

              {!result && (
                <Button
                  type="submit"
                  disabled={
                    submitting || (current.type === 'mcq' ? !selectedOption : !textAnswer)
                  }
                >
                  {submitting ? 'Checking…' : 'Submit'}
                </Button>
              )}
            </form>
          </motion.div>

          {result && (
            <>
              <FeedbackCard
                correct={result.correct}
                correctAnswer={current.answer}
                understandingLevel={result.understandingLevel}
                explanation={result.explanation}
                suggestion={result.suggestion}
                mastery={result.mastery}
                gamification={result.gamification}
                recommendation={result.recommendation}
              />
              <Button variant="secondary" onClick={goToNext}>
                Next question →
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
