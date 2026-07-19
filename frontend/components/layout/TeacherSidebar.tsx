'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: '📈' },
  { href: '/teacher/create', label: 'Create Exercise', icon: '➕' },
  { href: '/teacher/manage', label: 'Manage Exercises', icon: '🗂️' },
];

export function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/10 bg-slate-950/60 p-6 backdrop-blur-xl">
      <div className="mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
        MathAI
      </div>
      <span className="mb-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Teacher
      </span>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
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
