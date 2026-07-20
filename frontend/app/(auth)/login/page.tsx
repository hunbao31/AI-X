'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { storeSession } from '@/lib/session';
import type { LoginResult } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiPost<LoginResult>('/api/v1/auth/login', {
        identifier,
        password,
      });

      storeSession(result.token, result.user);
      router.push(
        result.user.role === 'student' ? '/dashboard' : '/teacher/dashboard',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm animate-fade-in">
      <h1 className="mb-6 text-2xl font-bold text-white">Welcome back</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="identifier"
            className="mb-1.5 block text-sm font-medium text-slate-300"
          >
            Username or email
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="input-base"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-slate-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-base"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        No account?{' '}
        <a href="/register" className="font-medium text-indigo-300 hover:text-indigo-200">
          Register
        </a>
      </p>
    </Card>
  );
}
