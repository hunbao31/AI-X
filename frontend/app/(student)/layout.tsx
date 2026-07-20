'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StudentSidebar } from '@/components/layout/StudentSidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { STUDENT_NAV } from '@/components/layout/nav-items';
import { MathBackdrop } from '@/components/layout/MathBackdrop';
import { PageTransition } from '@/components/layout/PageTransition';
import { MascotProvider } from '@/components/mascot/MascotProvider';
import { Mascot } from '@/components/mascot/Mascot';

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
    <MascotProvider>
      <div className="app-shell relative flex min-h-screen">
        <MathBackdrop />
        <StudentSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <MobileNav items={STUDENT_NAV} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        {/* Koaly rides along on every student page */}
        <Mascot />
      </div>
    </MascotProvider>
  );
}
