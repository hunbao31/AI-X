'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { MathText } from '@/components/ui/MathText';
import type { ClassSummary, ClassTopicReport } from '@/lib/types';

interface ClassAiSummary {
  classId: string;
  className: string;
  percent: number | null; // null = chưa có dữ liệu chẩn đoán nào cho lớp này
  loading: boolean;
  error: string | null;
}

interface TeacherStats {
  totalExercises: number;
  totalAttempts: number;
}

interface QuestionAnalytics {
  exerciseId: string;
  question: string;
  topic: string;
  attempts: number;
  correct: number;
  correctRate: number;
}

interface SetAnalytics {
  setId: string;
  title: string;
  attempts: number;
  avgScore: number;
  avgDurationSeconds: number | null;
}

const QUICK_LINKS = [
  {
    href: '/teacher/classes',
    title: 'Lớp học',
    description: 'Tạo lớp học và chia sẻ mã tham gia',
    icon: '🏫',
  },
  {
    href: '/teacher/manage?import=1',
    title: 'Nhập câu hỏi',
    description: 'Nhập nhiều câu hỏi cùng lúc từ file CSV',
    icon: '📥',
  },
  {
    href: '/teacher/sets',
    title: 'Bộ đề',
    description: 'Tạo bộ đề trắc nghiệm cho cả lớp cùng làm',
    icon: '🎯',
  },
];

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [questions, setQuestions] = useState<QuestionAnalytics[]>([]);
  const [setStatsList, setSetStatsList] = useState<SetAnalytics[]>([]);
  const [classReports, setClassReports] = useState<ClassAiSummary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<TeacherStats>('/api/v1/exercises/stats'),
      apiGet<ClassSummary[]>('/api/v1/classes'),
      apiGet<QuestionAnalytics[]>('/api/v1/analytics/questions'),
      apiGet<SetAnalytics[]>('/api/v1/analytics/sets'),
    ])
      .then(([teacherStats, classList, questionStats, quizStats]) => {
        setStats(teacherStats);
        setClasses(classList);
        setQuestions(questionStats);
        setSetStatsList(quizStats);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải số liệu thống kê.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (classes.length === 0) return;

    setClassReports(
      classes.map((c) => ({
        classId: c.id,
        className: c.name,
        percent: null,
        loading: true,
        error: null,
      })),
    );

    classes.forEach((c) => {
      apiGet<ClassTopicReport[]>(`/api/v1/diagnostic/classes/${c.id}/report`)
        .then((topics) => {
          // Chi tinh tren cac chu de thuc su co hoc sinh lam bai (so_hoc_sinh
          // > 0) -- cac chu de con lai co muc_do_hieu_trung_binh = null.
          const withData = topics.filter(
            (t) => t.so_hoc_sinh > 0 && t.muc_do_hieu_trung_binh !== null,
          );
          const totalStudents = withData.reduce((sum, t) => sum + t.so_hoc_sinh, 0);
          // Trung binh gia quyen theo so hoc sinh moi chu de -- chu de nhieu
          // hoc sinh co du lieu hon thi anh huong nhieu hon toi con so chung.
          const percent =
            withData.length === 0
              ? null
              : Math.round(
                  (withData.reduce(
                    (sum, t) => sum + (t.muc_do_hieu_trung_binh as number) * t.so_hoc_sinh,
                    0,
                  ) /
                    totalStudents) *
                    100,
                );
          setClassReports((prev) =>
            prev.map((r) => (r.classId === c.id ? { ...r, percent, loading: false } : r)),
          );
        })
        .catch((err) => {
          setClassReports((prev) =>
            prev.map((r) =>
              r.classId === c.id
                ? {
                    ...r,
                    loading: false,
                    error: err instanceof Error ? err.message : 'Không thể tải.',
                  }
                : r,
            ),
          );
        });
    });
  }, [classes]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Trang tổng quan giáo viên</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Đang tải số liệu…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="text-center transition-transform hover:scale-105">
              <p className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-4xl font-bold text-transparent">
                {stats?.totalExercises ?? 0}
              </p>
              <p className="mt-2 text-sm uppercase tracking-wide text-slate-400">
                Bài tập đã tạo
              </p>
            </Card>
            <Card className="text-center transition-transform hover:scale-105">
              <p className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-4xl font-bold text-transparent">
                {stats?.totalAttempts ?? 0}
              </p>
              <p className="mt-2 text-sm uppercase tracking-wide text-slate-400">
                Lượt làm bài của học sinh
              </p>
            </Card>
            <Card className="text-center transition-transform hover:scale-105">
              <p className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-4xl font-bold text-transparent">
                {classes.length}
              </p>
              <p className="mt-2 text-sm uppercase tracking-wide text-slate-400">
                Lớp học
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="block">
                <Card className="h-full transition-transform hover:scale-105">
                  <p className="text-2xl">{link.icon}</p>
                  <p className="mt-2 font-semibold text-white">{link.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{link.description}</p>
                </Card>
              </Link>
            ))}
          </div>

          {classReports.length > 0 && (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Mức độ hiểu theo lớp (AI)
              </h2>
              <div className="space-y-2">
                {classReports.map((r) => (
                  <div
                    key={r.classId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <span className="truncate text-sm font-medium text-white">
                      {r.className}
                    </span>
                    {r.loading ? (
                      <span className="shrink-0 text-xs text-slate-400">Đang tính…</span>
                    ) : r.error ? (
                      <span className="shrink-0 text-xs text-red-400">
                        Không tải được
                      </span>
                    ) : r.percent === null ? (
                      <span className="shrink-0 text-xs text-slate-500">
                        Chưa có dữ liệu chẩn đoán
                      </span>
                    ) : (
                      <span
                        className={`shrink-0 text-sm font-bold ${
                          r.percent < 50
                            ? 'text-red-300'
                            : r.percent < 75
                              ? 'text-yellow-300'
                              : 'text-green-300'
                        }`}
                      >
                        {r.percent}% hiểu bài
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {questions.length > 0 && (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Câu hỏi hay sai nhất
              </h2>
              {questions.slice(0, 5).map((q) => (
                <div
                  key={q.exerciseId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      <MathText text={q.question} />
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {q.topic} · {q.attempts} lượt làm
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-bold ${
                      q.correctRate < 50 ? 'text-red-300' : 'text-yellow-300'
                    }`}
                  >
                    {q.correctRate}% đúng
                  </span>
                </div>
              ))}
            </Card>
          )}

          {setStatsList.length > 0 && (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Hiệu suất bộ đề</h2>
              {setStatsList.slice(0, 6).map((s) => (
                <Link
                  key={s.setId}
                  href={`/teacher/sets/${s.setId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{s.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {s.attempts} lượt làm
                      {s.avgDurationSeconds !== null &&
                        ` · thời gian TB ${Math.round(s.avgDurationSeconds)}s`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-white">
                    Điểm TB {s.avgScore}
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
