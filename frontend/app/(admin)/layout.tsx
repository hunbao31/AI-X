'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/session';

// Stricter than (teacher)/layout.tsx and (student)/layout.tsx: those two only
// push away the ONE role that must not see them. This route holds
// cross-teacher, cross-class, all-student data, so every role except admin
// must be redirected out, not just students.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');

    if (!token || !raw) {
      router.push('/login');
      return;
    }

    let role: string | undefined;
    let name: string | undefined;
    try {
      const user = JSON.parse(raw);
      role = user?.role;
      name = user?.username;
    } catch {
      role = undefined;
    }

    if (role !== 'admin') {
      router.push(
        role === 'student' ? '/dashboard' : role === 'teacher' ? '/teacher/dashboard' : '/login',
      );
      return;
    }

    setUsername(name ?? '');
    setReady(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Quản trị hệ thống</p>
          <p className="text-sm font-medium text-white">{username}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-300 transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white"
        >
          Đăng xuất
        </button>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
    </div>
  );
}
