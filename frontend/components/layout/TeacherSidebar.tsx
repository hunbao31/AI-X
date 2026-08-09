'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TEACHER_NAV } from './nav-items';

export function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-white/10 bg-slate-950/60 p-6 backdrop-blur-xl md:flex">
      <div className="mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
        AI-X
      </div>
      <span className="mb-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Giáo viên
      </span>
      <nav className="flex flex-col gap-1">
        {TEACHER_NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white shadow-inner'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
