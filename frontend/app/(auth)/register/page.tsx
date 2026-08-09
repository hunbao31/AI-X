'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Role } from '@/lib/types';

type SignupRole = Extract<Role, 'student' | 'teacher'>;

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SignupRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiPost('/api/v1/auth/register', {
        username,
        email: email.trim() === '' ? null : email.trim(),
        password,
        role,
      });
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-white">Tạo tài khoản của bạn</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-sm font-medium text-slate-300"
          >
            Tên đăng nhập
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9._-]+"
            title="Chỉ gồm chữ cái, chữ số, dấu chấm, gạch dưới và gạch ngang"
            className="input-base"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-300"
          >
            Email <span className="text-slate-500">(không bắt buộc)</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-slate-300"
          >
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input-base"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Tôi là…
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['student', 'teacher'] as SignupRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  role === r
                    ? 'scale-105 border-indigo-400/60 bg-indigo-500/20 text-white shadow-lg shadow-indigo-500/20'
                    : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {r === 'student' ? 'Học sinh' : 'Giáo viên'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        Đã có tài khoản?{' '}
        <a href="/login" className="font-medium text-indigo-300 hover:text-indigo-200">
          Đăng nhập
        </a>
      </p>
    </Card>
  );
}
