'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

// Every route change fades + slides the page content in (0.4s). Keyed on
// pathname so navigation retriggers it.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
