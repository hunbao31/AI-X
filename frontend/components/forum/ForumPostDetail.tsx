'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiGet, apiPost, apiUpload, resolveImageUrl } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { MathText } from '@/components/ui/MathText';
import { AnswerCard } from './AnswerCard';
import { AnswerForm } from './AnswerForm';
import { XpFloat, XpFloatState } from './XpFloat';
import { useMascot } from '@/components/mascot/MascotProvider';
import { useSounds } from '@/lib/sounds';
import { useUser } from '@/lib/user-context';
import { timeAgo } from '@/lib/time';
import { staggerContainer, fadeSlideUp } from '@/lib/animations';
import type { ForumAnswer, ForumPostDetail as ForumPostDetailData } from '@/lib/types';

const ANSWER_XP_BASE = 10;

function sortAnswers(list: ForumAnswer[]): ForumAnswer[] {
  return [...list].sort((a, b) => {
    if (a.isAccepted !== b.isAccepted) return a.isAccepted ? -1 : 1;
    if (a.upvoteCount !== b.upvoteCount) return b.upvoteCount - a.upvoteCount;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

interface ForumPostDetailProps {
  postId: string;
  /** '/forum' for students, '/teacher/forum' for teachers. */
  basePath: string;
}

export function ForumPostDetail({ postId, basePath }: ForumPostDetailProps) {
  const { user } = useUser();
  const mascot = useMascot();
  const { playPop, playReward } = useSounds();

  const [post, setPost] = useState<ForumPostDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answering, setAnswering] = useState(false);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [xpFloat, setXpFloat] = useState<XpFloatState | null>(null);
  const xpFloatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    apiGet<ForumPostDetailData>(`/api/v1/forum/posts/${postId}`)
      .then((data) => setPost({ ...data, answers: sortAnswers(data.answers) }))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải câu hỏi.'),
      )
      .finally(() => setLoading(false));
  }, [postId]);

  useEffect(load, [load]);
  useEffect(() => {
    return () => {
      if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current);
    };
  }, []);

  function flashXp(amount: number) {
    setXpFloat({ id: Date.now(), amount });
    if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current);
    xpFloatTimer.current = setTimeout(() => setXpFloat(null), 1300);
  }

  async function handleAnswerSubmit(content: string, image: File | null) {
    if (!post) return;
    setAnswering(true);
    try {
      const form = new FormData();
      form.append('postId', post.id);
      form.append('content', content);
      if (image) form.append('image', image);

      const created = await apiUpload<ForumAnswer>('/api/v1/forum/answers', form);

      setPost((prev) =>
        prev
          ? {
              ...prev,
              answers: sortAnswers([...prev.answers, created]),
              answerCount: prev.answerCount + 1,
              rewardScore: prev.rewardScore + ANSWER_XP_BASE,
            }
          : prev,
      );
      playPop();
      flashXp(ANSWER_XP_BASE);
      mascot.react('gotit', `Đã đăng câu trả lời! +${ANSWER_XP_BASE} XP`);
    } finally {
      setAnswering(false);
    }
  }

  async function handleUpvote(answerId: string) {
    if (!post || upvotingId) return;
    setUpvotingId(answerId);
    try {
      const result = await apiPost<{ upvoted: boolean; upvoteCount: number }>(
        `/api/v1/forum/answers/${answerId}/upvote`,
        {},
      );
      setPost((prev) =>
        prev
          ? {
              ...prev,
              answers: sortAnswers(
                prev.answers.map((a) =>
                  a.id === answerId
                    ? { ...a, upvoteCount: result.upvoteCount, upvotedByMe: result.upvoted }
                    : a,
                ),
              ),
            }
          : prev,
      );
      // 'rankUp' is the closest existing preset for this (proud expression,
      // jump motion) — overriding its bubble text to fit the forum context.
      if (result.upvoted) mascot.react('rankUp', 'Bình chọn hay đấy!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bình chọn.');
    } finally {
      setUpvotingId(null);
    }
  }

  async function handleAccept(answerId: string) {
    if (!post || acceptingId) return;
    setAcceptingId(answerId);
    try {
      await apiPost(`/api/v1/forum/answers/${answerId}/accept`, {});
      setPost((prev) =>
        prev
          ? {
              ...prev,
              hasAcceptedAnswer: true,
              answers: sortAnswers(
                prev.answers.map((a) => ({ ...a, isAccepted: a.id === answerId })),
              ),
            }
          : prev,
      );
      playReward();
      mascot.react('celebrate', 'Đã đánh dấu là câu trả lời hay nhất! 🎉');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đánh dấu là câu trả lời hay nhất.');
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading) return <p className="text-slate-400">Đang tải câu hỏi…</p>;

  if (error && !post) {
    return (
      <Card className="mx-auto max-w-2xl">
        <p className="text-red-400">{error}</p>
        <Link
          href={basePath}
          className="mt-4 inline-block text-sm text-indigo-300 hover:text-indigo-200"
        >
          ← Quay lại diễn đàn
        </Link>
      </Card>
    );
  }
  if (!post) return null;

  const canAcceptAnyAnswer =
    user?.id === post.author.id || user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={basePath}
        className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
      >
        ← Tất cả câu hỏi
      </Link>

      <motion.div variants={fadeSlideUp} initial="hidden" animate="show">
        <Card className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveImageUrl(post.imageUrl)}
              alt="Câu hỏi"
              className="max-h-[480px] w-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar id={post.author.avatar} size={30} />
              <div>
                <p className="text-sm font-medium text-white">{post.author.username}</p>
                <p className="text-xs text-slate-500">{timeAgo(post.createdAt)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {post.hasAcceptedAnswer && <Badge tone="green">✓ Đã giải</Badge>}
              {post.topic && <Badge tone="indigo">{post.topic.name}</Badge>}
              {post.class && <Badge tone="slate">{post.class.name}</Badge>}
            </div>
          </div>

          {post.description && (
            <p className="text-base text-slate-200">
              <MathText text={post.description} />
            </p>
          )}
        </Card>
      </motion.div>

      <motion.div variants={fadeSlideUp} initial="hidden" animate="show">
        <Card className="relative space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Câu trả lời của bạn
            <XpFloat state={xpFloat} className="ml-2 -top-1" />
          </h2>
          <AnswerForm onSubmit={handleAnswerSubmit} submitting={answering} />
        </Card>
      </motion.div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">
          {post.answers.length} câu trả lời
        </h2>
        {post.answers.length === 0 ? (
          <Card>
            <p className="text-slate-300">
              Chưa có câu trả lời nào — hãy là người đầu tiên giúp {post.author.username}!
            </p>
          </Card>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {post.answers.map((answer) => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                isOwnAnswer={answer.author.id === user?.id}
                canAccept={
                  canAcceptAnyAnswer &&
                  !(user?.id === post.author.id && answer.author.id === user?.id)
                }
                onUpvote={handleUpvote}
                onAccept={handleAccept}
                upvoting={upvotingId === answer.id}
                accepting={acceptingId === answer.id}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
