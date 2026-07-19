'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TeacherSidebar } from '@/components/layout/TeacherSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MathBackdrop } from '@/components/layout/MathBackdrop';
import { PageTransition } from '@/components/layout/PageTransition';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
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

    if (!role) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
      return;
    }

    if (role === 'student') {
      router.push('/practice');
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <MathBackdrop />
      <TeacherSidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
