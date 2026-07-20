'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/Badge';
import { getStoredUser, clearSession } from '@/lib/session';
import type { PublicUser } from '@/lib/types';

export function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-white/5 px-8 backdrop-blur-xl">
      <div />
      <div className="flex items-center gap-4">
        {user && <Badge tone="indigo">{user.role}</Badge>}
        <span className="text-sm text-slate-300">{user?.username ?? '…'}</span>
        <button
          onClick={handleLogout}
          className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
