import { MotivationalQuote } from '@/components/ui/MotivationalQuote';
import { MathBackdrop } from '@/components/layout/MathBackdrop';
import { PageTransition } from '@/components/layout/PageTransition';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6">
      <MathBackdrop />
      <MotivationalQuote className="max-w-xl text-xl sm:text-2xl" />
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
