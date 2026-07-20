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
    <main className="app-shell flex min-h-screen items-center justify-center">
      <p className="text-slate-400">Loading…</p>
    </main>
  );
}
