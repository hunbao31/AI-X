'use client';

import { useEffect, useMemo, useRef, useState, FormEvent, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DifficultyBadge } from '@/components/exercise/DifficultyBadge';
import { McqOptions } from '@/components/exercise/McqOptions';
import { FeedbackCard } from '@/components/exercise/FeedbackCard';
import { MathText } from '@/components/ui/MathText';
import { useMascot } from '@/components/mascot/MascotProvider';
import { useSounds } from '@/lib/sounds';
import type { Exercise, AttemptResult, ClassSummary, ClassDetail } from '@/lib/types';

function PracticePageInner() {
  const { playClick, playCorrect, playWrong } = useSounds();
  const mascot = useMascot();
  // Consecutive correct answers in this practice session.
  const streakRef = useRef(0);
  const searchParams = useSearchParams();
  // A ?topic= link (from the dashboard's class → topic picker) preselects
  // the topic and skips straight past the class step below — the student
  // already picked a class there. Questions still never auto-show, Start
  // is still explicit.
  const topicFromUrl = searchParams.get('topic');

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Buoc 1 -- chon lop dang tham gia (bo qua neu da den tu link ?topic=
  // cua dashboard, noi lop da duoc chon roi). Chu de chi lay tu lop da
  // chon, khong con gop chung tat ca lop nhu truoc.
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classesLoading, setClassesLoading] = useState(topicFromUrl === null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [classDetailLoading, setClassDetailLoading] = useState(false);

  const [selectedTopic, setSelectedTopic] = useState<string | null>(topicFromUrl);
  // Gop trac nghiem + tu luan vao 1 luong luyen tap duy nhat -- hoc sinh tu
  // chon loai cau muon luyen (item 15/16), khong tach thanh 2 trang rieng.
  const [typeFilter, setTypeFilter] = useState<'mcq' | 'text' | 'all'>('all');
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
        setLoadError(err instanceof Error ? err.message : 'Không thể tải chủ đề.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (topicFromUrl !== null) return;
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setClassesLoading(false));
  }, [topicFromUrl]);

  function selectClass(id: string) {
    playClick();
    setSelectedClassId(id);
    setSelectedTopic(null);
    setClassDetailLoading(true);
    apiGet<ClassDetail>(`/api/v1/classes/${id}`)
      .then(setClassDetail)
      .catch(() => setClassDetail(null))
      .finally(() => setClassDetailLoading(false));
  }

  function changeClass() {
    playClick();
    setSelectedClassId(null);
    setClassDetail(null);
    setSelectedTopic(null);
  }

  const typeFilteredExercises = useMemo(
    () => (typeFilter === 'all' ? exercises : exercises.filter((e) => e.type === typeFilter)),
    [exercises, typeFilter],
  );
  // Topic dua tren lop da chon (ten chu de van la khoa dung chung voi
  // Exercise.topic, giong het co che ?topic= tu dashboard) -- an di nhung
  // chu de khong co bai tap nao khop loai dang loc.
  const topics = useMemo(
    () =>
      (classDetail?.topics ?? [])
        .map((t) => t.name)
        .filter((name) => typeFilteredExercises.some((e) => e.topic === name)),
    [classDetail, typeFilteredExercises],
  );
  const topicExercises = useMemo(
    () => typeFilteredExercises.filter((e) => e.topic === selectedTopic),
    [typeFilteredExercises, selectedTopic],
  );
  const current = topicExercises[index] ?? null;

  // Koaly ponders along while a practice run is active.
  useEffect(() => {
    mascot.setMood(started ? 'thinking' : 'idle');
    return () => mascot.setMood('idle');
  }, [started, mascot]);

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
      if (attemptResult.needsTeacherReview) {
        // Tu luan -- dang cho giao vien duyet, khong co dung/sai de phan
        // ung am thanh/mascot.
      } else if (attemptResult.correct) {
        playCorrect();
        streakRef.current += 1;
        if (streakRef.current >= 3) {
          mascot.react('streak', `${streakRef.current} liên tiếp! 🔥`);
        } else {
          mascot.react('correct');
        }
      } else {
        playWrong();
        streakRef.current = 0;
        mascot.react('wrong');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không thể nộp câu trả lời.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {loading ? (
        <p className="text-center text-slate-400">Đang tải chủ đề…</p>
      ) : loadError ? (
        <Card>
          <p className="text-red-400">{loadError}</p>
        </Card>
      ) : exercises.length === 0 ? (
        <Card>
          <p className="text-slate-300">
            Chưa có bài tập nào — giáo viên của bạn chưa tạo nội dung nào.
          </p>
        </Card>
      ) : !started && topicFromUrl === null && !selectedClassId ? (
        // --- Step 1: pick which of your classes you want to practice.
        <Card className="space-y-5">
          <h1 className="text-xl font-semibold text-white">Chọn lớp học để luyện tập</h1>
          {classesLoading ? (
            <p className="text-sm text-slate-400">Đang tải lớp học…</p>
          ) : classes.length === 0 ? (
            <p className="text-sm text-slate-300">
              Bạn chưa tham gia lớp học nào — hãy hỏi giáo viên để lấy mã tham
              gia, hoặc tìm bài luyện tập công khai ở{' '}
              <a href="/quizzes" className="text-indigo-300 hover:text-indigo-200">
                Ngân hàng câu hỏi
              </a>
              .
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {classes.map((c) => (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => selectClass(c.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-xl border border-white/15 bg-white/5 p-4 text-left transition-colors duration-200 hover:bg-white/10"
                >
                  <p className="font-medium text-white">{c.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Giáo viên: {c.teacher.username} · {c._count.topics} chủ đề
                  </p>
                </motion.button>
              ))}
            </div>
          )}
        </Card>
      ) : !started ? (
        // --- Step 2: pick a topic within the chosen class, then explicitly
        // press Start. No exercise content is fetched or shown until then.
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Chọn chủ đề để luyện tập</h1>
            {topicFromUrl === null && (
              <button
                type="button"
                onClick={changeClass}
                className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
              >
                ← Đổi lớp
              </button>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-300">Loại câu hỏi</p>
            <div className="flex gap-2">
              {(
                [
                  { value: 'all', label: 'Cả hai' },
                  { value: 'mcq', label: 'Trắc nghiệm' },
                  { value: 'text', label: 'Tự luận' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    playClick();
                    setTypeFilter(opt.value);
                  }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    typeFilter === opt.value
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {classDetailLoading ? (
            <p className="text-sm text-slate-400">Đang tải chủ đề…</p>
          ) : topics.length === 0 ? (
            <p className="text-sm text-slate-400">
              Lớp này chưa có chủ đề nào khớp loại câu hỏi đã chọn.
            </p>
          ) : (
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
          )}
          <Button onClick={handleStart} disabled={!selectedTopic} className="w-full">
            Bắt đầu
          </Button>
        </Card>
      ) : !current ? (
        <Card className="space-y-4">
          <p className="text-slate-300">Chủ đề này chưa có bài tập nào.</p>
          <Button variant="secondary" onClick={changeTopic}>
            ← Chọn chủ đề khác
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
            <h2 className="text-xl font-semibold text-white">
              <MathText text={current.question} />
            </h2>

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
                  placeholder="Nhập câu trả lời…"
                  className="input-base px-4 py-3"
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
                  {submitting ? 'Đang kiểm tra…' : 'Nộp bài'}
                </Button>
              )}
            </form>
          </motion.div>

          {result && (
            <>
              {result.needsTeacherReview ? (
                <p className="text-sm font-semibold text-indigo-300">
                  Câu hỏi đang được chờ duyệt — giáo viên sẽ chấm câu tự luận này sau.
                </p>
              ) : (
                <FeedbackCard
                  correct={result.correct!}
                  correctAnswer={current.answer}
                  understandingLevel={result.understandingLevel!}
                  explanation={result.explanation!}
                  suggestion={result.suggestion!}
                  mastery={result.mastery!}
                  gamification={result.gamification!}
                  recommendation={result.recommendation!}
                />
              )}
              <Button variant="secondary" onClick={goToNext}>
                Câu hỏi tiếp theo →
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<p className="text-center text-slate-400">Đang tải…</p>}>
      <PracticePageInner />
    </Suspense>
  );
}
