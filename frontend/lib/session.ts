import type { PublicUser, Theme } from './types';

// Small helpers around the localStorage session all pages share.

export function getStoredUser(): PublicUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: PublicUser): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  // The account's saved theme wins on login so devices stay in sync.
  const theme: Theme = user.theme === 'light' ? 'light' : 'dark';
  localStorage.setItem('theme', theme);
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function hasToken(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('token') !== null;
}
