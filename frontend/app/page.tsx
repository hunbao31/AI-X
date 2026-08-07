'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MathBackdrop } from '@/components/layout/MathBackdrop';
import { KoalyFace } from '@/components/mascot/KoalyFace';
import { staggerContainer, fadeSlideUp, springSmooth } from '@/lib/animations';

const FEATURES = [
  {
    icon: '🎯',
    title: 'Trắc nghiệm kiểu Kahoot',
    desc: 'Bộ trắc nghiệm có tính giờ với phản hồi tức thì — tạo một bộ chỉ trong vài phút.',
  },
  {
    icon: '🏆',
    title: 'Bảng xếp hạng',
    desc: 'Xếp hạng toàn hệ thống và theo từng lớp, cập nhật trực tiếp khi mọi người cùng chơi.',
  },
  {
    icon: '💬',
    title: 'Diễn đàn cộng đồng',
    desc: 'Bí bài? Chụp ảnh, đăng câu hỏi và nhận trợ giúp thật từ mọi người.',
  },
  {
    icon: '⚡',
    title: 'XP & Chuỗi ngày',
    desc: 'Nhận XP cho mỗi câu trả lời đúng, duy trì chuỗi ngày học và lên cấp.',
  },
];

export default function HomePage() {
  const router = useRouter();
  // Gate: check auth once on mount, then either redirect away (signed-in
  // users skip straight to their dashboard) or reveal the landing page.
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowLanding(true);
      return;
    }

    const raw = localStorage.getItem('user');
    let role: string | null = null;
    try {
      role = raw ? JSON.parse(raw)?.role : null;
    } catch {
      role = null;
    }
    router.push(
      role === 'teacher' ? '/teacher/dashboard' : role === 'admin' ? '/admin' : '/practice',
    );
  }, [router]);

  if (!showLanding) {
    return (
      <main className="app-shell flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Đang tải…</p>
      </main>
    );
  }

  return (
    <main className="app-shell relative min-h-screen overflow-x-hidden">
      <MathBackdrop />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pb-16 pt-24 text-center"
      >
        <motion.div variants={fadeSlideUp} className="flex items-center gap-3">
          <KoalyFace expression="excited" size={64} />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
            EduAI
          </span>
        </motion.div>

        <motion.h1
          variants={fadeSlideUp}
          className="text-4xl font-black text-white sm:text-5xl"
        >
          Học toán như chơi game
        </motion.h1>

        <motion.p variants={fadeSlideUp} className="max-w-xl text-lg text-slate-300">
          Quản lý lớp học, trắc nghiệm kiểu Kahoot, theo dõi mức độ thành
          thạo và XP kiểu Duolingo — tất cả trong một nền tảng.
        </motion.p>

        <motion.div
          variants={fadeSlideUp}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/register">
            <Button className="px-8 py-3 text-base">Bắt đầu ngay</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" className="px-8 py-3 text-base">
              Đăng nhập
            </Button>
          </Link>
        </motion.div>
      </motion.section>

      <motion.section
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            variants={fadeSlideUp}
            whileHover={{ scale: 1.03 }}
            transition={springSmooth}
            className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center shadow-xl backdrop-blur-xl"
          >
            <p className="text-3xl">{f.icon}</p>
            <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
          </motion.div>
        ))}
      </motion.section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-slate-500">
        <Link
          href="/register"
          className="font-medium text-indigo-300 hover:text-indigo-200"
        >
          Tạo tài khoản miễn phí →
        </Link>
      </footer>
    </main>
  );
}
