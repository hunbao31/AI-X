'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/Badge';

interface StoredUser {
  id: string;
  email: string;
  role: 'student' | 'teacher';
}

export function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) setUser(JSON.parse(raw));
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/10 bg-white/5 px-8 backdrop-blur-xl">
      <div />
      <div className="flex items-center gap-4">
        {user && <Badge tone="indigo">{user.role}</Badge>}
        <span className="text-sm text-slate-300">{user?.email ?? '…'}</span>
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
