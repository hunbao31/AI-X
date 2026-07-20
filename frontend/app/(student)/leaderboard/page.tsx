'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { XpLeaderboard } from '@/components/leaderboard/XpLeaderboard';
import { ConfettiBurst } from '@/components/ui/ConfettiBurst';
import { useMascot } from '@/components/mascot/MascotProvider';
import { getStoredUser } from '@/lib/session';
import { useSounds } from '@/lib/sounds';
import { springSmooth, springBouncy } from '@/lib/animations';
import type { ClassSummary, XpLeaderboardEntry } from '@/lib/types';

const POLL_MS = 30_000;

export default function LeaderboardPage() {
  const { playClick, playRankUp } = useSounds();
  const mascot = useMascot();
  const me = getStoredUser();

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  // 'global' or a class id.
  const [scope, setScope] = useState<string>('global');
  const [entries, setEntries] = useState<XpLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Rank-change celebration state.
  const [rankDelta, setRankDelta] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  // Previous rank per scope+user, so deltas survive tab switches.
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiGet<ClassSummary[]>('/api/v1/classes')
      .then(setClasses)
      .catch(() => setClasses([]));
    return () => {
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    };
  }, []);

  const load = useCallback(
    (targetScope: string, { silent }: { silent: boolean }) => {
      if (!silent) setLoading(true);
      setError('');
      const path =
        targetScope === 'global'
          ? '/api/v1/leaderboard/global'
          : `/api/v1/leaderboard/class/${targetScope}`;

      apiGet<XpLeaderboardEntry[]>(path)
        .then((next) => {
          setEntries((prev) => {
            // Skip identical payloads so polling never causes re-renders.
            if (silent && JSON.stringify(prev) === JSON.stringify(next)) return prev;
            return next;
          });

          if (me) {
            const key = `${targetScope}:${me.id}`;
            const myEntry = next.find((e) => e.userId === me.id);
            const prevRank = prevRanksRef.current.get(key);
            if (myEntry && prevRank !== undefined && myEntry.rank < prevRank) {
              // Climbed the board → floating "+N ranks" (and confetti on
              // breaking into the podium).
              const climbed = prevRank - myEntry.rank;
              setRankDelta(climbed);
              if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
              deltaTimerRef.current = setTimeout(() => setRankDelta(null), 2400);
              playRankUp();
              // Koaly celebrates the climb — breaking into the podium
              // upgrades the reaction (and fires the confetti burst).
              if (prevRank > 3 && myEntry.rank <= 3) {
                setBurst(true);
                mascot.react('top3');
              } else {
                mascot.react(
                  'rankUp',
                  `↑ +${climbed} rank${climbed === 1 ? '' : 's'}!`,
                );
              }
            }
            if (myEntry) prevRanksRef.current.set(key, myEntry.rank);
          }
        })
        .catch((err) =>
          setError(err instanceof Error ? err.message : 'Failed to load leaderboard.'),
        )
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [me, playRankUp, mascot],
  );

  // Initial + on scope change, then poll quietly so rank changes animate in.
  useEffect(() => {
    load(scope, { silent: false });
    const interval = setInterval(() => load(scope, { silent: true }), POLL_MS);
    return () => clearInterval(interval);
  }, [scope, load]);

  const tabs = [
    { id: 'global', label: '🌍 Global' },
    ...classes.map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <div className="relative mx-auto max-w-2xl space-y-6">
      {burst && <ConfettiBurst onDone={() => setBurst(false)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <Button variant="ghost" onClick={() => load(scope, { silent: true })}>
          ↻ Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            type="button"
            onClick={() => {
              playClick();
              setScope(tab.id);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springSmooth}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
              scope === tab.id
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      <div className="relative">
        {/* Floating rank-up toast */}
        <AnimatePresence>
          {rankDelta !== null && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.8 }}
              animate={{ opacity: 1, y: -6, scale: 1, transition: springBouncy }}
              exit={{ opacity: 0, y: -28, transition: { duration: 0.4 } }}
              className="pointer-events-none absolute -top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-green-400/50 bg-green-500/20 px-4 py-1.5 text-sm font-bold text-green-300 shadow-lg shadow-green-500/20 backdrop-blur-xl"
            >
              ↑ +{rankDelta} rank{rankDelta === 1 ? '' : 's'}
            </motion.div>
          )}
        </AnimatePresence>

        <Card>
          {loading ? (
            <p className="text-slate-400">Loading leaderboard…</p>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <XpLeaderboard entries={entries} highlightUserId={me?.id ?? null} />
          )}
        </Card>
      </div>
    </div>
  );
}
