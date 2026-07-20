'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { apiPatch } from './api';
import type { Theme, UserProfile } from './types';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

function applyThemeClass(theme: Theme): void {
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  // The pre-hydration inline script in the root layout already applied the
  // class; this just brings React state in line with it.
  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem('theme', next);
    applyThemeClass(next);

    // Persist to the account when logged in — fire and forget; the UI never
    // blocks on it and local state is already correct.
    if (localStorage.getItem('token')) {
      apiPatch<UserProfile>('/api/v1/users/me/settings', { theme: next }).catch(
        () => undefined,
      );
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readStoredTheme() === 'light' ? 'dark' : 'light');
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
