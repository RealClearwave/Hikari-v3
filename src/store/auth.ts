import { create } from 'zustand';
import { User } from '@/api/user';

const isBrowser = typeof window !== 'undefined';

function safeGetItem(key: string): string | null {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function safeRemoveItem(key: string) {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const stored = safeGetItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  token: safeGetItem('token'),
  isAuthenticated: !!safeGetItem('token'),
  
  login: (userData, token) => {
    safeSetItem('token', token);
    safeSetItem('user', JSON.stringify(userData));
    set({ user: userData, token, isAuthenticated: true });
  },
  
  logout: () => {
    safeRemoveItem('token');
    safeRemoveItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
