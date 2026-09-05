'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MathText } from '@/components/ui/MathText';
import { useMascot } from '@/components/mascot/MascotProvider';
import { useSounds } from '@/lib/sounds';
import type { ClassSummary, DiagnosticExercise, DiagnosticAttemptResult, DiagnosticDifficulty } from '@/lib/types';

const DIFF_LABEL: Record<DiagnosticDifficulty, string> = {
  de: 'Dễ',
  trung_binh: 'Trung bình',
  kho: 'Khó',
};
const DIFF_TONE: Record<DiagnosticDifficulty, 'green' | 'yellow' | 'red'> = {
  de: 'green',
  trung_binh: 'yellow',
  kho: 'red',
};

export default function PracticeSgkPage() {
  const params = useParams<{ baiSgk: string }>();
  const baiSgk = params.baiSgk;
  const { playClick, playCorrect, playWrong } = useSounds();
  const mascot = useMascot();

  const [questions, setQuestions] = useState<DiagnosticExercise[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<DiagnosticAttemptResult | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then((items) => {
        setClasses(items);
        if (items.length === 1) setSelectedClassId(items[0].id);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Không thể tải lớp học.'))
      .finally(() => setClassesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setQuestions(null);
      return;
    }
    apiGet<DiagnosticExercise[]>(`/api/v1/diagnostic/bai/${encodeURIComponent(baiSgk)}/questions?classId=${encodeURIComponent(selectedClassId)}`)
      .then(setQuestions)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Không thể tải câu hỏi.'),
      );
  }, [baiSgk, selectedClassId]);

  useEffect(() => {
    mascot.setMood('thinking');
    return () => mascot.setMood('idle');
  }, [mascot]);

  const current = questions?.[index] ?? null;
  const done = questions !== null && index >= questions.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !answer) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const evaluation = await apiPost<DiagnosticAttemptResult>('/api/v1/diagnostic/attempts', {
        classId: selectedClassId,
        exerciseId: current.id,
        answer,
      });
      setResult(evaluation);
      if (evaluation.correct === null) {
        // tu_luan -- dang cho giao vien duyet, khong co dung/sai nao de phan
        // ung am thanh/mascot ca.
      } else if (evaluation.correct) {
        playCorrect();
        mascot.react('correct');
      } else {
        playWrong();
        mascot.react('wrong');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể nộp câu trả lời.');
    } finally {
      setSubmitting(false);
    }
  }

  function goToNext() {
    playClick();
    setResult(null);
    setAnswer('');
    setSubmitError('');
    setIndex((i) => i + 1);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
      >
        ← Trang tổng quan
      </Link>

      {loadError ? (
        <Card>
          <p className="text-red-400">{loadError}</p>
        </Card>
      ) : classesLoading ? (
        <p className="text-center text-slate-400">Đang tải lớp học…</p>
      ) : !selectedClassId ? (
        <Card className="space-y-4">
          <h1 className="text-xl font-semibold text-white">Chọn lớp học</h1>
          {classes.length === 0 ? (
            <p className="text-slate-300">Bạn chưa tham gia lớp học nào.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {classes.map((klass) => (
                <button
                  key={klass.id}
                  type="button"
                  onClick={() => setSelectedClassId(klass.id)}
                  className="rounded-xl border border-white/15 bg-white/5 p-4 text-left text-white hover:bg-white/10"
                >
                  <p className="font-medium">{klass.name}</p>
                  <p className="mt-1 text-xs text-slate-400">Giáo viên: {klass.teacher.username}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : questions === null ? (
        <p className="text-center text-slate-400">Đang tải câu hỏi…</p>
      ) : questions.length === 0 ? (
        <Card>
          <p className="text-slate-300">Bài này chưa có câu hỏi nào.</p>
        </Card>
      ) : done ? (
        <Card className="space-y-4 text-center">
          <h1 className="text-xl font-semibold text-white">Đã hoàn thành bài {baiSgk}! 🎉</h1>
          <p className="text-sm text-slate-400">
            Mức độ hiểu của bạn đã được cập nhật — xem trên trang tổng quan.
          </p>
          <Link href="/dashboard">
            <Button>Về trang tổng quan</Button>
          </Link>
        </Card>
      ) : current ? (
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Bài {baiSgk} · Câu {index + 1}/{questions.length}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSelectedClassId('')} className="text-xs text-slate-400 hover:text-slate-200">Đổi lớp</button>
              <Badge tone={DIFF_TONE[current.difficulty]}>{DIFF_LABEL[current.difficulty]}</Badge>
            </div>
          </div>

          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold text-white">
              <MathText text={current.question} />
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {current.answerType === 'tu_luan' ? (
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={!!result || submitting}
                  rows={4}
                  placeholder="Trình bày câu trả lời của bạn…"
                  className="input-base w-full resize-none"
                />
              ) : (
                <div className="space-y-2">
                  {(current.options ?? []).map((opt) => {
                    const isSelected = answer === opt;
                    const isCorrectOpt = !!result && opt === result.correctAnswer;
                    const isWrongSelected = !!result && isSelected && result.correct === false;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => !result && setAnswer(opt)}
                        disabled={!!result || submitting}
                        className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors duration-150 ${
                          isCorrectOpt
                            ? 'border-green-500/40 bg-green-500/10 text-green-200'
                            : isWrongSelected
                              ? 'border-red-500/40 bg-red-500/10 text-red-200'
                              : isSelected
                                ? 'border-indigo-400/60 bg-indigo-500/10 text-white'
                                : 'border-white/10 bg-white/5 text-slate-200'
                        }`}
                      >
                        <MathText text={opt} />
                      </button>
                    );
                  })}
                </div>
              )}

              {submitError && <p className="text-sm text-red-400">{submitError}</p>}

              {!result && (
                <Button type="submit" disabled={submitting || !answer}>
                  {submitting ? 'Đang kiểm tra…' : 'Nộp bài'}
                </Button>
              )}
            </form>
          </motion.div>

          {result && (
            <>
              {result.correct === null ? (
                <p className="text-sm font-semibold text-indigo-300">
                  Đã ghi nhận câu trả lời của bạn — giáo viên sẽ chấm sau.
                </p>
              ) : (
                <p className={`text-sm font-semibold ${result.correct ? 'text-green-300' : 'text-red-300'}`}>
                  {result.correct ? 'Chính xác!' : 'Chưa đúng'}
                </p>
              )}
              <Button variant="secondary" onClick={goToNext}>
                Câu tiếp theo →
              </Button>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
