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

// Display-only labels for the Theme and Role enums — comparisons/logic
// elsewhere keep using the original English values.
const THEME_LABEL: Record<string, string> = {
  dark: 'Chế độ tối',
  light: 'Chế độ sáng',
};

const ROLE_LABEL: Record<string, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  admin: 'Quản trị viên',
};

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const playClick = useClickSound();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<UserProfile>('/api/v1/users/me')
      .then(setProfile)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ.'),
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
      <h1 className="text-2xl font-bold text-white">Cài đặt</h1>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Giao diện</h2>
        <p className="text-sm text-slate-400">
          Chọn giao diện hiển thị ứng dụng trên thiết bị này. Lựa chọn của bạn
          sẽ được lưu vào tài khoản.
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
              <p className="mt-2 text-sm font-semibold text-white">
                {THEME_LABEL[t] ?? t}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {t === 'dark'
                  ? 'Phù hợp môi trường thiếu sáng, độ tương phản cao'
                  : 'Nền sáng, chữ đậm màu'}
              </p>
            </motion.button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Tài khoản</h2>
          <a
            href={role === 'teacher' ? '/teacher/settings/profile' : '/settings/profile'}
            className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
          >
            Chỉnh sửa hồ sơ →
          </a>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-400">Tên người dùng</span>
            <span className="text-sm font-medium text-white">{username}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-400">Email</span>
            <span className="text-sm font-medium text-white">
              {email ?? 'Chưa thiết lập'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-slate-400">Vai trò</span>
            {role ? <Badge tone="indigo">{ROLE_LABEL[role] ?? role}</Badge> : <span>…</span>}
          </div>
          {profile && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-400">Thành viên từ</span>
              <span className="text-sm font-medium text-white">
                {new Date(profile.createdAt).toLocaleDateString('vi-VN', {
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
