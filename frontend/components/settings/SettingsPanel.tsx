'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiGet } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/lib/theme';
import { useClickSound } from '@/lib/useClickSound';
import { getStoredUser } from '@/lib/session';
import type { Theme, UserProfile } from '@/lib/types';

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const playClick = useClickSound();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<UserProfile>('/api/v1/users/me')
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load profile.'),
      );
  }, []);

  function chooseTheme(next: Theme) {
    playClick();
    setTheme(next);
  }

  // Fall back to the cached session user while the profile request is in
  // flight, so the page never renders empty.
  const cached = getStoredUser();
  const username = profile?.username ?? cached?.username ?? '…';
  const email = profile?.email ?? cached?.email ?? null;
  const role = profile?.role ?? cached?.role;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Appearance</h2>
        <p className="text-sm text-slate-400">
          Choose how the app looks on this device. Your choice is saved to your
          account.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(['dark', 'light'] as Theme[]).map((t) => (
            <motion.button
              key={t}
              type="button"
              onClick={() => chooseTheme(t)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`rounded-xl border p-4 text-left transition-colors duration-200 ${
                theme === t
                  ? 'border-indigo-400/60 bg-indigo-500/20 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-400/40'
                  : 'border-white/15 bg-white/5 hover:bg-white/10'
              }`}
            >
              <p className="text-2xl">{t === 'dark' ? '🌙' : '☀️'}</p>
              <p className="mt-2 text-sm font-semibold capitalize text-white">
                {t} mode
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {t === 'dark'
                  ? 'Low-light friendly, high contrast accents'
                  : 'Bright surfaces, darker text'}
              </p>
            </motion.button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Account</h2>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-400">Username</span>
            <span className="text-sm font-medium text-white">{username}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-400">Email</span>
            <span className="text-sm font-medium text-white">
              {email ?? 'Not set'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-400">Role</span>
            {role ? <Badge tone="indigo">{role}</Badge> : <span>…</span>}
          </div>
          {profile && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-400">Member since</span>
              <span className="text-sm font-medium text-white">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
