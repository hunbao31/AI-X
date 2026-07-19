'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentSidebar } from '@/components/layout/StudentSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MathBackdrop } from '@/components/layout/MathBackdrop';
import { PageTransition } from '@/components/layout/PageTransition';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');

    if (!token || !raw) {
      router.push('/login');
      return;
    }

    let role: string | undefined;
    try {
      role = JSON.parse(raw)?.role;
    } catch {
      role = undefined;
    }

    // Stale session from before the role system existed — force a clean
    // re-login instead of guessing, rather than letting a page render in
    // an inconsistent state.
    if (!role) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }

    if (role === 'teacher') {
      router.push('/teacher/dashboard');
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <MathBackdrop />
      <StudentSidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
