'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from './nav-items';

// Horizontal scrollable nav shown under the Topbar on small screens — the
// desktop sidebars are hidden there.
export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
              active
                ? 'bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-white'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
