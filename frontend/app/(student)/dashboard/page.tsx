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
} from '@/lib/types';

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

  function loadAll() {
    Promise.all([
      apiGet<AnalyticsSummary>('/api/v1/analytics'),
      apiGet<GamificationSummary>('/api/v1/gamification'),
      apiGet<ClassSummary[]>('/api/v1/classes'),
      apiGet<TopicRecommendation[]>('/api/v1/recommendation/topics'),
      apiGet<TopicAnalytics[]>('/api/v1/analytics/topics'),
      apiGet<XpLeaderboardEntry[]>('/api/v1/leaderboard/global'),
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
          cont,
          recentActivity,
        ]) => {
          setSummary(analytics);
          setGamification(gamificationSummary);
          setClasses(classList);
          setRecommendations(recs);
          setTopicProgress(topics);
          setTopPlayers(leaderboard.slice(0, 5));
          setContinueInfo(cont);
          setRecent(recentActivity);
        },
      )
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.'),
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
    mascot.react('greet', username ? `Hi ${username}!` : 'Hi!');
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
      setError(err instanceof Error ? err.message : 'Failed to load class.');
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
      setJoinError(err instanceof Error ? err.message : 'Failed to join class.');
    } finally {
      setJoining(false);
    }
  }

  if (loading) return <p className="text-slate-400">Loading dashboard…</p>;

  if (error || !summary || !gamification) {
    return <p className="text-red-400">{error || 'No analytics available.'}</p>;
  }

  const xpIntoLevel = gamification.xp % 100;
  const weakTopics = recommendations.filter((r) => r.action === 'repeat');

  const stats = [
    { label: 'Total attempts', value: summary.totalAttempts },
    { label: 'Accuracy', value: `${summary.accuracy}%` },
    { label: 'Correct', value: summary.correct },
    { label: 'Incorrect', value: summary.incorrect },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Welcome back{me ? `, ${me.username}` : ''} 👋
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
              <h2 className="text-lg font-semibold text-white">🏆 Top players</h2>
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
              View full leaderboard →
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
                    Continue Learning
                  </p>
                  {continueInfo ? (
                    <>
                      <h2 className="mt-1 truncate text-xl font-bold text-white">
                        {continueInfo.title}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-400">
                        Resume at question {continueInfo.lastQuestionIndex + 1} of{' '}
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
                        Pick your first quiz
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-400">
                        Join a class or browse public quizzes to begin.
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
                      <Button>Start Now →</Button>
                    </Link>
                  </motion.div>
                  <Link href="/quick-quiz">
                    <Button variant="secondary">🎲 Quick Quiz</Button>
                  </Link>
                </div>
              </div>
              {recent?.lastQuiz && (
                <p className="mt-4 border-t border-white/10 pt-3 text-sm text-slate-400">
                  Recent: you scored{' '}
                  <span className="font-semibold text-white">
                    {recent.lastQuiz.correctCount}/{recent.lastQuiz.totalCount}
                  </span>{' '}
                  in <span className="font-semibold text-white">{recent.lastQuiz.title}</span>
                  {recent.lastTopic && (
                    <>
                      {' · last topic: '}
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
                  Level {gamification.level}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200">
                  🔥 {gamification.streak}-day streak
                </span>
              </div>
              <div className="mb-1 flex justify-between text-sm text-slate-400">
                <span>XP</span>
                <span>{xpIntoLevel}/100 to next level</span>
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
                {gamification.xp} XP total
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
                <h2 className="text-lg font-semibold text-white">Badges</h2>
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
                <h2 className="text-lg font-semibold text-white">Topic progress</h2>
                {topicProgress.slice(0, 6).map((t) => (
                  <div key={t.topic}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-300">{t.topic}</span>
                      <span className="text-slate-400">
                        {t.masteryScore}% · {t.correctRate}% correct
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
                <h2 className="text-lg font-semibold text-white">My Classes</h2>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Step 1 · choose a class
                </span>
              </div>

              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter class code (e.g. 7KPQ2M)"
                  maxLength={6}
                  className="input-base flex-1 uppercase tracking-widest"
                />
                <Button type="submit" disabled={joining || joinCode.length < 6}>
                  {joining ? 'Joining…' : 'Join'}
                </Button>
              </form>
              {joinError && <p className="text-sm text-red-400">{joinError}</p>}

              {classes.length === 0 ? (
                <p className="text-sm text-slate-400">
                  You have not joined any classes yet — ask your teacher for a
                  join code.
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
                        Teacher: {c.teacher.username} · {c._count.topics} topics ·{' '}
                        {c._count.sets} quizzes
                      </p>
                    </motion.button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Steps 2 + 3: pick a topic or quiz inside the selected class */}
          {classLoading && <p className="text-slate-400">Loading class…</p>}

          {selectedClass && !classLoading && (
            <motion.div variants={fadeSlideUp} initial="hidden" animate="show">
              <Card className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    {selectedClass.name}
                  </h2>
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Step 2 · pick a topic or quiz
                  </span>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Topics
                  </h3>
                  {selectedClass.topics.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No topics in this class yet.
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
                            {t._count.exercises} exercises
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Quizzes
                  </h3>
                  {selectedClass.sets.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      No quizzes in this class yet.
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
                              {s._count.items} questions
                              {s.timeLimitPerQuestion
                                ? ` · ${s.timeLimitPerQuestion}s per question`
                                : ' · untimed'}
                            </p>
                          </div>
                          <Link href={`/quiz/${s.id}`}>
                            <Button variant="secondary">Open</Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Adaptive recommendation: repeat what you got wrong */}
          {weakTopics.length > 0 && (
            <motion.div variants={fadeSlideUp}>
              <Card className="space-y-3">
                <h2 className="text-lg font-semibold text-white">
                  Recommended for you
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
                          repeat
                        </Badge>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {r.correctRate}% correct · mastery {r.masteryScore}/100
                      </p>
                    </div>
                    <Link href={`/practice?topic=${encodeURIComponent(r.topic)}`}>
                      <Button variant="secondary">Practice</Button>
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
