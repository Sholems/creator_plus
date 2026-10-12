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
const LOGOUT_EVENT_KEY = 'auth:logout';

// Non-secret "signed in" hint read by the edge proxy (src/proxy.ts) so it can
// bounce signed-out visitors before protected pages render. It carries no
// credential — the API still authorizes every request.
export const SESSION_HINT_COOKIE = 'cp_session';
const setSessionHint = (on: boolean) => {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = on
    ? `${SESSION_HINT_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`
    : `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
};

/**
 * Resolve a post-login destination from `?next=` or `?redirect=`. Only
 * same-origin relative paths are allowed — `//host`, `/\host` and absolute
 * URLs are rejected to prevent open redirects.
 */
export function safeRedirectPath(params: URLSearchParams, fallback = '/community'): string {
  const raw = params.get('next') ?? params.get('redirect');
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f]/.test(raw) || raw.startsWith('/auth/')) return fallback;
  return raw;
}

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
  login: (email: string, password: string, remember?: boolean) => Promise<{ user: User; accessToken: string; requiresTwoFactor?: boolean; tempToken?: string }>;
  register: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ accessToken: string; user: User }>;
  verifyTwoFactorLogin: (tempToken: string, code: string) => Promise<{ user: User; accessToken: string }>;
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
    setSessionHint(true);
  };

  const clearStoredToken = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setSessionHint(false);
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
      } else {
        setSessionHint(true);
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
    if (response.requiresTwoFactor) {
      return { user: null as any, accessToken: '', requiresTwoFactor: true, tempToken: response.tempToken };
    }
    clearStoredToken();
    (remember ? localStorage : sessionStorage).setItem('token', response.accessToken);
    setSessionHint(true);
    setToken(response.accessToken);
    const fresh = await api.getProfile(response.accessToken);
    setUser(fresh);
    return { ...response, user: fresh };
  };

  const verifyTwoFactorLogin = async (tempToken: string, code: string) => {
    const response = await api.verifyTwoFactorLogin(tempToken, code);
    clearStoredToken();
    localStorage.setItem('token', response.accessToken);
    setSessionHint(true);
    setToken(response.accessToken);
    const fresh = await api.getProfile(response.accessToken);
    setUser(fresh);
    return { ...response, user: fresh };
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const response = await api.register(email, password, displayName);
    clearStoredToken();
    localStorage.setItem('token', response.accessToken);
    setSessionHint(true);
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

  // Sign out everywhere: revoke the refresh cookie, clear local state, tell
  // other open tabs, then leave the (possibly protected) current page.
  const logout = () => {
    void api.logout().catch(() => undefined);
    clearStoredToken();
    setToken(null);
    setUser(null);
    try {
      localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
    window.location.assign('/');
  };

  // Another tab signed out — drop this tab's session too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOGOUT_EVENT_KEY) return;
      clearStoredToken();
      setToken(null);
      setUser(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        verifyTwoFactorLogin,
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
