'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiGet, apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { XpLeaderboard } from '@/components/leaderboard/XpLeaderboard';
import { useMascot } from '@/components/mascot/MascotProvider';
import { getStoredUser } from '@/lib/session';
import { staggerContainer, fadeSlideUp, slideFromLeft } from '@/lib/animations';
import type {
  AnalyticsSummary,
  GamificationSummary,
  ClassSummary,
  ClassDetail,
  TopicRecommendation,
  TopicAnalytics,
  XpLeaderboardEntry,
  ContinueInfo,
  RecentActivity,
  StudentCatalogChuong,
  StudentStepResult,
} from '@/lib/types';

const MUC_DO_TONE: Record<StudentStepResult['muc_do'], 'red' | 'yellow' | 'green'> = {
  'Can chu y': 'red',
  'Chua chac chan': 'yellow',
  'Co ve vung': 'green',
};

export default function DashboardPage() {
  const me = getStoredUser();

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [recommendations, setRecommendations] = useState<TopicRecommendation[]>([]);
  const [topicProgress, setTopicProgress] = useState<TopicAnalytics[]>([]);
  const [topPlayers, setTopPlayers] = useState<XpLeaderboardEntry[]>([]);
  const [continueInfo, setContinueInfo] = useState<ContinueInfo | null>(null);
  const [recent, setRecent] = useState<RecentActivity | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Class → Topic → Quiz picker state. Nothing below auto-loads questions;
  // every step is an explicit click.
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);
  const [classLoading, setClassLoading] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // Chương trình SGK dùng chung cho mọi lớp (không phụ thuộc selectedClass),
  // chỉ hiển thị khi đã chọn 1 lớp — đúng luồng "vào lớp -> thấy chương/bài".
  const [sgkCatalog, setSgkCatalog] = useState<StudentCatalogChuong[]>([]);
  const [sgkCollapsed, setSgkCollapsed] = useState<Set<string>>(new Set());

  // Báo cáo AI (Knowledge Tracing) — gọi theo yêu cầu (không tự động ở mỗi
  // lần tải trang) vì model chạy qua tunnel cá nhân, tránh gọi liên tục.
  const [aiReport, setAiReport] = useState<StudentStepResult[] | null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportError, setAiReportError] = useState('');

  async function loadAiReport() {
    setAiReportLoading(true);
    setAiReportError('');
    try {
      setAiReport(await apiGet<StudentStepResult[]>('/api/v1/diagnostic/me/report'));
    } catch (err) {
      setAiReportError(err instanceof Error ? err.message : 'Không thể tải báo cáo AI.');
    } finally {
      setAiReportLoading(false);
    }
  }

  function toggleSgkChuong(chuongSgk: string) {
    setSgkCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(chuongSgk)) next.delete(chuongSgk);
      else next.add(chuongSgk);
      return next;
    });
  }

  function loadAll() {
    Promise.all([
      apiGet<AnalyticsSummary>('/api/v1/analytics'),
      apiGet<GamificationSummary>('/api/v1/gamification'),
      apiGet<ClassSummary[]>('/api/v1/classes'),
      apiGet<TopicRecommendation[]>('/api/v1/recommendation/topics'),
      apiGet<TopicAnalytics[]>('/api/v1/analytics/topics'),
      apiGet<XpLeaderboardEntry[]>('/api/v1/leaderboard/global'),
      apiGet<StudentCatalogChuong[]>('/api/v1/diagnostic/catalog'),
      apiGet<ContinueInfo | null>('/api/v1/users/me/continue'),
      apiGet<RecentActivity>('/api/v1/users/me/recent-activity'),
    ])
      .then(
        ([
          analytics,
          gamificationSummary,
          classList,
          recs,
          topics,
          leaderboard,
          sgk,
          cont,
          recentActivity,
        ]) => {
          setSummary(analytics);
          setGamification(gamificationSummary);
          setClasses(classList);
          setRecommendations(recs);
          setTopicProgress(topics);
          setTopPlayers(leaderboard.slice(0, 5));
          setSgkCatalog(sgk);
          setContinueInfo(cont);
          setRecent(recentActivity);
        },
      )
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải trang tổng quan.'),
      )
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);

  // Koaly greets once per visit, then settles into a mood that reflects the
  // student's progress: nothing played yet → sleepy, weak topics → determined,
  // otherwise upbeat.
  const mascot = useMascot();
  const greetedRef = useRef(false);
  useEffect(() => {
    if (loading || greetedRef.current) return;
    greetedRef.current = true;
    const username = getStoredUser()?.username;
    mascot.react('greet', username ? `Chào ${username}!` : 'Xin chào!');
    if (!recent?.lastQuiz && !recent?.lastTopic) {
      mascot.setMood('sleepy');
    } else if (recommendations.some((r) => r.action === 'repeat')) {
      mascot.setMood('determined');
    } else {
      mascot.setMood('happy');
    }
  }, [loading, recent, recommendations, mascot]);

  async function selectClass(id: string) {
    setClassLoading(true);
    try {
      setSelectedClass(await apiGet<ClassDetail>(`/api/v1/classes/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải lớp học.');
    } finally {
      setClassLoading(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setJoinError('');
    setJoining(true);
    try {
      const joined = await apiPost<ClassDetail>('/api/v1/classes/join', {
        code: joinCode,
      });
      setJoinCode('');
      setSelectedClass(joined);
      const classList = await apiGet<ClassSummary[]>('/api/v1/classes');
      setClasses(classList);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Không thể tham gia lớp học.');
    } finally {
      setJoining(false);
    }
  }

  if (loading) return <p className="text-slate-400">Đang tải trang tổng quan…</p>;

  if (error || !summary || !gamification) {
    return <p className="text-red-400">{error || 'Không có dữ liệu phân tích.'}</p>;
  }

  const xpIntoLevel = gamification.xp % 100;
  const weakTopics = recommendations.filter((r) => r.action === 'repeat');

  const stats = [
    { label: 'Tổng số lượt làm', value: summary.totalAttempts },
    { label: 'Độ chính xác', value: `${summary.accuracy}%` },
    { label: 'Đúng', value: summary.correct },
    { label: 'Sai', value: summary.incorrect },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Chào mừng trở lại{me ? `, ${me.username}` : ''} 👋
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px,1fr]">
        {/* Left leaderboard panel — slides in from the left */}
        <motion.aside
          variants={slideFromLeft}
          initial="hidden"
          animate="show"
          className="order-2 lg:order-1"
        >
          <Card className="space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">🏆 Người chơi hàng đầu</h2>
            </div>
            <XpLeaderboard
              entries={topPlayers}
              highlightUserId={me?.id ?? null}
              compact
            />
            <Link
              href="/leaderboard"
              className="block text-center text-sm font-medium text-indigo-300 hover:text-indigo-200"
            >
              Xem bảng xếp hạng đầy đủ →
            </Link>
          </Card>
        </motion.aside>

        {/* Main column — cards fade + slide up with a 50ms stagger */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="order-1 space-y-6 lg:order-2"
        >
          {/* Hero: Continue Learning (resume > weak topic > browse) + Quick Start */}
          <motion.div variants={fadeSlideUp}>
            <Card className="relative overflow-hidden border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 to-purple-500/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                    Tiếp tục học
                  </p>
                  {continueInfo ? (
                    <>
                      <h2 className="mt-1 truncate text-xl font-bold text-white">
                        {continueInfo.title}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-400">
                        Tiếp tục từ câu {continueInfo.lastQuestionIndex + 1}/
                        {continueInfo.totalCount}
                      </p>
                    </>
                  ) : recommendations[0] ? (
                    <>
                      <h2 className="mt-1 truncate text-xl font-bold text-white">
                        {recommendations[0].topic}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {recommendations[0].message}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-1 text-xl font-bold text-white">
                        Chọn bài trắc nghiệm đầu tiên
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-400">
                        Tham gia lớp học hoặc khám phá các bài trắc nghiệm công khai để bắt đầu.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {/* Subtle pulse on the primary CTA — transform-only loop */}
                  <motion.div
                    animate={{ scale: 1.04 }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      repeatType: 'mirror',
                      ease: 'easeInOut',
                    }}
                  >
                    <Link
                      href={
                        continueInfo
                          ? `/quiz/${continueInfo.setId}`
                          : recommendations[0]
                            ? `/practice?topic=${encodeURIComponent(recommendations[0].topic)}`
                            : '/quizzes'
                      }
                    >
                      <Button>Bắt đầu ngay →</Button>
                    </Link>
                  </motion.div>
                  <Link href="/quick-quiz">
                    <Button variant="secondary">🎲 Trắc nghiệm nhanh</Button>
                  </Link>
                </div>
              </div>
              {recent?.lastQuiz && (
                <p className="mt-4 border-t border-white/10 pt-3 text-sm text-slate-400">
                  Gần đây: bạn đạt{' '}
                  <span className="font-semibold text-white">
                    {recent.lastQuiz.correctCount}/{recent.lastQuiz.totalCount}
                  </span>{' '}
                  trong <span className="font-semibold text-white">{recent.lastQuiz.title}</span>
                  {recent.lastTopic && (
                    <>
                      {' · chủ đề gần nhất: '}
                      <span className="text-slate-300">{recent.lastTopic.topic}</span>
                    </>
                  )}
                </p>
              )}
            </Card>
          </motion.div>

          <motion.div variants={fadeSlideUp}>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-lg font-bold text-transparent">
                  Cấp độ {gamification.level}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200">
                  🔥 Chuỗi {gamification.streak} ngày
                </span>
              </div>
              <div className="mb-1 flex justify-between text-sm text-slate-400">
                <span>XP</span>
                <span>{xpIntoLevel}/100 để lên cấp</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpIntoLevel}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                />
              </div>
              <p className="mt-2 text-right text-xs text-slate-500">
                Tổng {gamification.xp} XP
              </p>
            </Card>
          </motion.div>

          <motion.div
            variants={fadeSlideUp}
            className="grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {stats.map((s) => (
              <Card
                key={s.label}
                className="text-center transition-transform hover:scale-105"
              >
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                  {s.label}
                </p>
              </Card>
            ))}
          </motion.div>

          {/* Badges */}
          {gamification.badges && gamification.badges.some((b) => b.earned) && (
            <motion.div variants={fadeSlideUp}>
              <Card className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Huy hiệu</h2>
                <div className="flex flex-wrap gap-2">
                  {gamification.badges.map((b) => (
                    <span
                      key={b.id}
                      title={`${b.name} — ${b.description}`}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                        b.earned
                          ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                          : 'border-white/10 bg-white/5 text-slate-500 opacity-50 grayscale'
                      }`}
                    >
                      <span>{b.icon}</span>
                      {b.name}
                    </span>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Progress per topic (%) */}
          {topicProgress.length > 0 && (
            <motion.div variants={fadeSlideUp}>
              <Card className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Tiến độ theo chủ đề</h2>
                {topicProgress.slice(0, 6).map((t) => (
                  <div key={t.topic}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-300">{t.topic}</span>
                      <span className="text-slate-400">
                        {t.masteryScore}% · {t.correctRate}% đúng
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: t.masteryScore / 100 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="h-full w-full origin-left rounded-full bg-gradient-to-r from-indigo-400 to-purple-500"
                      />
                    </div>
                  </div>
                ))}
              </Card>
            </motion.div>
          )}

          {/* Step 1: pick a class */}
          <motion.div variants={fadeSlideUp}>
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Lớp học của tôi</h2>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Bước 1 · chọn lớp học
                </span>
              </div>

              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã lớp học (vd: 7KPQ2M)"
                  maxLength={6}
                  className="input-base flex-1 uppercase tracking-widest"
                />
                <Button type="submit" disabled={joining || joinCode.length < 6}>
                  {joining ? 'Đang tham gia…' : 'Tham gia'}
                </Button>
              </form>
              {joinError && <p className="text-sm text-red-400">{joinError}</p>}

              {classes.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Bạn chưa tham gia lớp học nào — hãy hỏi giáo viên để lấy mã
                  tham gia.
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
                      className={`rounded-xl border p-4 text-left transition-colors duration-200 ${
                        selectedClass?.id === c.id
                          ? 'border-indigo-400/60 bg-indigo-500/20 shadow-lg shadow-indigo-500/20'
                          : 'border-white/15 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <p className="font-medium text-white">{c.name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Giáo viên: {c.teacher.username} · {c._count.topics} chủ đề ·{' '}
                        {c._count.sets} bài trắc nghiệm
                      </p>
                    </motion.button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Steps 2 + 3: pick a topic or quiz inside the selected class */}
          {classLoading && <p className="text-slate-400">Đang tải lớp học…</p>}

          {selectedClass && !classLoading && (
            <motion.div variants={fadeSlideUp} initial="hidden" animate="show">
              <Card className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    {selectedClass.name}
                  </h2>
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Bước 2 · chọn chủ đề hoặc bài trắc nghiệm
                  </span>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Chủ đề
                  </h3>
                  {selectedClass.topics.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Lớp học này chưa có chủ đề nào.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedClass.topics.map((t) => (
                        <Link
                          key={t.id}
                          href={`/practice?topic=${encodeURIComponent(t.name)}`}
                          className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                        >
                          {t.name}
                          <span className="ml-2 text-xs text-slate-500">
                            {t._count.exercises} bài tập
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Trắc nghiệm
                  </h3>
                  {selectedClass.sets.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Lớp học này chưa có bài trắc nghiệm nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedClass.sets.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{s.title}</p>
                            <p className="text-xs text-slate-400">
                              {s._count.items} câu hỏi
                              {s.timeLimitPerQuestion
                                ? ` · ${s.timeLimitPerQuestion} giây mỗi câu`
                                : ' · không giới hạn thời gian'}
                            </p>
                          </div>
                          <Link href={`/quiz/${s.id}`}>
                            <Button variant="secondary">Mở</Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Chương trình học (SGK)
                  </h3>
                  {sgkCatalog.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Giáo viên chưa soạn câu hỏi chẩn đoán nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sgkCatalog.map((chuong) => {
                        const isCollapsed = sgkCollapsed.has(chuong.chuongSgk);
                        return (
                          <div key={chuong.chuongSgk} className="rounded-xl border border-white/10">
                            <button
                              type="button"
                              onClick={() => toggleSgkChuong(chuong.chuongSgk)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-white"
                            >
                              <span>{chuong.chuongSgk}</span>
                              <span className="text-xs font-normal text-slate-400">
                                {isCollapsed ? '▸' : '▾'}
                              </span>
                            </button>
                            {!isCollapsed && (
                              <div className="flex flex-wrap gap-2 px-3 pb-3">
                                {chuong.bai.map((b) => (
                                  <Link
                                    key={b.baiSgk}
                                    href={`/practice-sgk/${b.baiSgk}`}
                                    className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                                  >
                                    Bài {b.baiSgk}
                                    <span className="ml-2 text-xs text-slate-500">
                                      {b.questionCount} câu hỏi
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Mức độ hiểu (AI) — gọi model KT theo yêu cầu, gộp toàn bộ lịch
              sử làm câu hỏi chẩn đoán của học sinh. */}
          <motion.div variants={fadeSlideUp}>
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Mức độ hiểu (AI)</h2>
                <Button variant="secondary" onClick={loadAiReport} disabled={aiReportLoading}>
                  {aiReportLoading ? 'Đang phân tích…' : 'Xem mức độ hiểu'}
                </Button>
              </div>
              {aiReportError && <p className="text-sm text-red-400">{aiReportError}</p>}
              {aiReport && aiReport.length === 0 && (
                <p className="text-sm text-slate-400">
                  Bạn chưa làm câu hỏi chẩn đoán nào — vào một lớp học và chọn 1 bài trong
                  Chương trình học để bắt đầu.
                </p>
              )}
              {aiReport && aiReport.length > 0 && (
                <div className="space-y-2">
                  {aiReport.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{step.bai_tap}</p>
                        {step.canh_bao && step.tien_de_thieu.length > 0 && (
                          <p className="mt-1 text-xs text-red-300">
                            Tiền đề còn thiếu: {step.tien_de_thieu.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {step.phan_tram_hieu}%
                        </span>
                        <Badge tone={MUC_DO_TONE[step.muc_do]}>{step.muc_do}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Adaptive recommendation: repeat what you got wrong */}
          {weakTopics.length > 0 && (
            <motion.div variants={fadeSlideUp}>
              <Card className="space-y-3">
                <h2 className="text-lg font-semibold text-white">
                  Đề xuất cho bạn
                </h2>
                {weakTopics.map((r) => (
                  <div
                    key={r.topic}
                    className="flex items-center justify-between rounded-xl border border-red-400/20 bg-red-500/10 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {r.topic}{' '}
                        <Badge tone="red" className="ml-2">
                          ôn lại
                        </Badge>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {r.correctRate}% đúng · thành thạo {r.masteryScore}/100
                      </p>
                    </div>
                    <Link href={`/practice?topic=${encodeURIComponent(r.topic)}`}>
                      <Button variant="secondary">Luyện tập</Button>
                    </Link>
                  </div>
                ))}
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
