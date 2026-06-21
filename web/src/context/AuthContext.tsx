import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/services/api';
import { setTokens } from '@/services/http';
import { STORAGE } from '@/constants/config';
import type { User } from '@/types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE.access);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => setTokens(null, null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.login(email, password);
    setTokens(r.accessToken, r.refreshToken);
    setUser(r.user);
  };
  const register = async (email: string, password: string, fullName: string) => {
    const r = await api.register(email, password, fullName);
    setTokens(r.accessToken, r.refreshToken);
    setUser(r.user);
  };
  const logout = () => {
    setTokens(null, null);
    setUser(null);
  };
  const refreshUser = async () => setUser(await api.me());

  return <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</Ctx.Provider>;
}
