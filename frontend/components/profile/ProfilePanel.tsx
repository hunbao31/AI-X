'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { apiPatch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarSelector } from '@/components/profile/AvatarSelector';
import { useUser } from '@/lib/user-context';
import { useMascot } from '@/components/mascot/MascotProvider';
import { popIn } from '@/lib/animations';
import type { UserProfile } from '@/lib/types';

// Same rule the backend enforces: 3–32 chars, no spaces or "@".
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

// Display-only labels for the Role enum — comparisons elsewhere
// (e.g. user.role === 'teacher') keep using the original English values.
const ROLE_LABEL: Record<string, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  admin: 'Quản trị viên',
};

// "This is MY account": live preview, pick-a-Koaly avatar grid, instant
// username validation. Mounted at /settings/profile (student) and
// /teacher/settings/profile.
export function ProfilePanel() {
  const { user, setUser } = useUser();
  // No-op outside the student layout's MascotProvider — safe for teachers.
  const mascot = useMascot();

  const [username, setUsername] = useState(user?.username ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? 'koaly_default');
  const [initialized, setInitialized] = useState(user !== null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // The provider hydrates from localStorage after mount — sync the form once
  // the user arrives.
  if (!initialized && user) {
    setUsername(user.username);
    setAvatar(user.avatar);
    setInitialized(true);
  }

  if (!user) return <p className="text-slate-400">Đang tải hồ sơ…</p>;

  const trimmed = username.trim();
  const usernameInvalid =
    trimmed.length > 0 && !USERNAME_PATTERN.test(trimmed)
      ? trimmed.length < 3
        ? 'Cần ít nhất 3 ký tự.'
        : /\s/.test(trimmed)
          ? 'Không được có khoảng trắng.'
          : 'Chỉ được dùng chữ cái, chữ số, ".", "_" và "-".'
      : '';
  const dirty = trimmed !== user.username || avatar !== user.avatar;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user || !dirty || usernameInvalid) return;
    setError('');
    setSaving(true);
    setSaved(false);
    try {
      const updated = await apiPatch<UserProfile>('/api/v1/users/me', {
        ...(trimmed !== user.username ? { username: trimmed } : {}),
        ...(avatar !== user.avatar ? { avatar } : {}),
      });
      setUser({
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role,
        theme: updated.theme,
        avatar: updated.avatar,
      });
      setSaved(true);
      mascot.react('love', 'Trông đẹp đấy!');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // Server messages are user-ready ("Username already taken").
      setError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Hồ sơ của tôi</h1>
        <Link
          href={user.role === 'teacher' ? '/teacher/settings' : '/settings'}
          className="text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
        >
          ← Cài đặt
        </Link>
      </div>

      {/* Live preview: exactly how the rest of the app will show you */}
      <Card className="flex items-center gap-4 border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 to-purple-500/10">
        <motion.div
          key={avatar}
          variants={popIn}
          initial="hidden"
          animate="show"
        >
          <Avatar id={avatar} size={72} />
        </motion.div>
        <div className="min-w-0">
          <p className="truncate text-xl font-bold text-white">
            {trimmed || user.username}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone="indigo">{ROLE_LABEL[user.role] ?? user.role}</Badge>
            <span className="text-xs text-slate-400">Xem trước</span>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Tên người dùng</h2>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            minLength={3}
            maxLength={32}
            required
            className="input-base"
          />
          {usernameInvalid && <p className="text-sm text-red-400">{usernameInvalid}</p>}
          <p className="text-xs text-slate-500">
            3–32 ký tự, không khoảng trắng. Đây là cách mọi người sẽ thấy bạn.
          </p>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Chọn Koaly của bạn</h2>
          <AvatarSelector selected={avatar} onSelect={setAvatar} />
        </Card>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={saving || !dirty || usernameInvalid !== ''}
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
          <AnimatePresence>
            {saved && (
              <motion.span
                variants={popIn}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                className="text-sm font-semibold text-green-300"
              >
                ✓ Đã lưu!
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
