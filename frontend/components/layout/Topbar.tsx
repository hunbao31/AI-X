'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { clearSession } from '@/lib/session';
import { useUser } from '@/lib/user-context';

// Display-only labels for the Role enum — comparisons elsewhere
// (e.g. user.role === 'teacher') keep using the original English values.
const ROLE_LABEL: Record<string, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  admin: 'Quản trị viên',
};

export function Topbar() {
  const router = useRouter();
  const { user, clearUser } = useUser();

  function handleLogout() {
    clearSession();
    clearUser();
    router.push('/login');
  }

  const profileHref =
    user?.role === 'teacher' ? '/teacher/settings/profile' : '/settings/profile';

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-white/5 px-4 backdrop-blur-xl sm:px-8">
      <div />
      <div className="flex items-center gap-3">
        {user && (
          <Badge tone="indigo" className="max-sm:hidden">
            {ROLE_LABEL[user.role] ?? user.role}
          </Badge>
        )}
        {/* User card: [avatar] username → profile */}
        <Link
          href={profileHref}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors duration-200 hover:bg-white/10"
          title="Chỉnh sửa hồ sơ"
        >
          <Avatar id={user?.avatar} size={30} />
          <span className="text-sm font-medium text-slate-200">
            {user?.username ?? '…'}
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
