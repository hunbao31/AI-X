'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { MathText } from '@/components/ui/MathText';
import { fadeSlideUp } from '@/lib/animations';
import { resolveImageUrl } from '@/lib/api';
import { timeAgo } from '@/lib/time';
import type { ForumPostSummary } from '@/lib/types';

interface PostCardProps {
  post: ForumPostSummary;
  /** '/forum' for students, '/teacher/forum' for teachers. */
  basePath: string;
}

// Social-feed card: image thumbnail, username+avatar (never email), time,
// answer count, XP reward badge, "Solved" flag. Pair with staggerContainer
// on the parent list for the entrance stagger.
export function PostCard({ post, basePath }: PostCardProps) {
  return (
    <motion.div variants={fadeSlideUp}>
      <Link href={`${basePath}/${post.id}`} className="block">
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-xl transition-transform duration-200 hover:scale-[1.01]">
          {post.imageUrl && (
            <div className="aspect-[4/3] w-full overflow-hidden bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveImageUrl(post.imageUrl)}
                alt="Câu hỏi"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar id={post.author.avatar} size={26} />
                <span className="truncate text-sm font-medium text-slate-200">
                  {post.author.username}
                </span>
              </div>
              <span className="shrink-0 text-xs text-slate-500">
                {timeAgo(post.createdAt)}
              </span>
            </div>

            {post.description && (
              <p
                className={
                  post.imageUrl
                    ? 'line-clamp-2 text-sm text-slate-300'
                    : 'line-clamp-4 text-sm text-slate-300'
                }
              >
                <MathText text={post.description} />
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {post.hasAcceptedAnswer && <Badge tone="green">✓ Đã giải</Badge>}
              {post.topic && <Badge tone="indigo">{post.topic.name}</Badge>}
              {post.class && <Badge tone="slate">{post.class.name}</Badge>}
              <span className="text-xs text-slate-400">
                💬 {post.answerCount} câu trả lời
              </span>
              {post.rewardScore > 0 && (
                <span className="text-xs font-semibold text-amber-300">
                  ⚡ {post.rewardScore} XP
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
