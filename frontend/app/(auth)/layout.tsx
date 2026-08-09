import { MathBackdrop } from '@/components/layout/MathBackdrop';
import { PageTransition } from '@/components/layout/PageTransition';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell relative flex min-h-screen flex-col items-center justify-center gap-10 p-6">
      <MathBackdrop />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
        AI-X
      </div>
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
