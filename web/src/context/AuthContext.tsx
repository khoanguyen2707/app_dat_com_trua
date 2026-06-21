import { createContext, useContext } from 'react';
import type { User } from '@/types';

export interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);
