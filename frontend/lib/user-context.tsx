'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getStoredUser } from './session';
import type { PublicUser } from './types';

// Global user identity. Initialized from the localStorage session; profile
// edits push through setUser so every consumer (Topbar user card, profile
// preview, ...) updates instantly — no reload, no refetch.

interface UserContextValue {
  user: PublicUser | null;
  /** Persist + broadcast an updated user (writes the session storage too). */
  setUser: (user: PublicUser) => void;
  /** Drop the in-memory user on logout (session storage cleared separately). */
  clearUser: () => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => undefined,
  clearUser: () => undefined,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<PublicUser | null>(null);

  // localStorage is client-only — hydrate after mount.
  useEffect(() => {
    setUserState(getStoredUser());
  }, []);

  const setUser = useCallback((next: PublicUser) => {
    localStorage.setItem('user', JSON.stringify(next));
    setUserState(next);
  }, []);

  const clearUser = useCallback(() => setUserState(null), []);

  const value = useMemo(
    () => ({ user, setUser, clearUser }),
    [user, setUser, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  return useContext(UserContext);
}
