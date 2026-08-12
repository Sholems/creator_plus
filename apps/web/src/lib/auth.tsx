'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { api } from './api';

// Access tokens are short-lived (15m). Refresh a little before expiry so an
// active session never lapses.
const PROACTIVE_REFRESH_MS = 13 * 60 * 1000;

export interface CreatorProfileSummary {
  id: string;
  storeName: string;
  slug: string;
  verified: boolean;
  verificationStatus: string;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  emailVerified: boolean;
  status: string;
  roles?: string[];
  creatorProfile?: CreatorProfileSummary | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<{ user: User; accessToken: string }>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ accessToken: string; user: User }>;
  refresh: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isCreator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dedupe concurrent refreshes into a single in-flight request.
  const refreshingRef = useRef<Promise<string | null> | null>(null);

  const readStoredToken = () =>
    typeof window !== 'undefined'
      ? localStorage.getItem('token') || sessionStorage.getItem('token')
      : null;

  const writeStoredToken = (value: string) => {
    // Keep the token wherever it already lives; default to localStorage.
    const store = sessionStorage.getItem('token') ? sessionStorage : localStorage;
    store.setItem('token', value);
  };

  const clearStoredToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
  };

  // Exchange the httpOnly refresh cookie for a new access token. Single-flight:
  // concurrent callers share one request.
  const tryRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return refreshingRef.current;
    const inflight = (async () => {
      try {
        const { accessToken } = await api.refresh();
        writeStoredToken(accessToken);
        setToken(accessToken);
        return accessToken;
      } catch {
        clearStoredToken();
        setToken(null);
        setUser(null);
        return null;
      } finally {
        refreshingRef.current = null;
      }
    })();
    refreshingRef.current = inflight;
    return inflight;
  }, []);

  // Bootstrap: validate the stored access token (or exchange the refresh
  // cookie) BEFORE publishing it to state, so pages never fire protected
  // requests with a stale token. `token` stays null until it is known-good.
  useEffect(() => {
    (async () => {
      const stored = readStoredToken();
      let validToken: string | null = stored;
      try {
        if (stored) {
          setUser(await api.getProfile(stored));
        } else {
          validToken = await tryRefresh();
          if (validToken) setUser(await api.getProfile(validToken));
        }
      } catch (error: any) {
        if (error?.status === 401) {
          // Stored access token expired — try the refresh cookie once.
          validToken = await tryRefresh();
          if (validToken) {
            try {
              setUser(await api.getProfile(validToken));
            } catch {
              validToken = null;
            }
          }
        } else {
          console.error('Failed to load user:', error);
          validToken = null;
        }
      }
      if (!validToken) {
        clearStoredToken();
        setUser(null);
      }
      setToken(validToken);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Proactively refresh shortly before the 15m access token expires.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => void tryRefresh(), PROACTIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [token, tryRefresh]);

  const login = async (email: string, password: string, remember = true) => {
    const response = await api.login(email, password);
    clearStoredToken();
    (remember ? localStorage : sessionStorage).setItem('token', response.accessToken);
    setToken(response.accessToken);
    const fresh = await api.getProfile(response.accessToken);
    setUser(fresh);
    return { ...response, user: fresh };
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const response = await api.register(email, password, displayName);
    clearStoredToken();
    localStorage.setItem('token', response.accessToken);
    setToken(response.accessToken);
    setUser(response.user);
    return response;
  };

  // Re-fetch the current user (kept for API compatibility).
  const refresh = async () => {
    if (!token) return;
    try {
      setUser(await api.getProfile(token));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const logout = () => {
    void api.logout().catch(() => undefined);
    clearStoredToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        refresh,
        logout,
        isAuthenticated: !!user,
        isCreator: !!user?.creatorProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
