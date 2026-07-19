'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const raw = localStorage.getItem('user');
    const role = raw ? JSON.parse(raw).role : null;
    router.push(role === 'teacher' ? '/teacher/dashboard' : '/practice');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <p className="text-slate-400">Loading…</p>
    </main>
  );
}
