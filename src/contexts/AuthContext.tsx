import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, ApiError } from '../api/client';
import { setCurrentUser, type AuthUser } from '../lib/authStore';
import { queryClient } from '../lib/queryClient';
import { seedIfEmpty } from '../db/repository';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<{ isNew: boolean }>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    setCurrentUser(u);
  }, []);

  // Restore session on mount; seed demo data only in guest mode
  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then(({ user: u }) => applyUser(u))
      .catch(() => {
        applyUser(null);
        seedIfEmpty();
      })
      .finally(() => setLoading(false));
  }, [applyUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const { user: u } = await apiFetch<{ user: AuthUser }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        applyUser(u);
        queryClient.invalidateQueries();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Login failed.');
        throw err;
      }
    },
    [applyUser],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const { user: u } = await apiFetch<{ user: AuthUser }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        applyUser(u);
        queryClient.invalidateQueries();
        return { isNew: true };
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Registration failed.');
        throw err;
      }
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => null);
    applyUser(null);
    queryClient.clear();
  }, [applyUser]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
