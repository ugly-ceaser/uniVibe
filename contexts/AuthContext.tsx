import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { api, authApi, ApiError } from '@/utils/api';
import {
  AUTH_STORAGE_KEYS,
  extractAuthSession,
  parseStoredAuthSession,
  type AuthUser,
} from '@/utils/authSession';
import { log } from '@/config/environment';

type LoginRequest = {
  email: string;
  password: string;
};

type RegisterRequest = {
  username: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  email: string;
  password: string;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (details: RegisterRequest) => Promise<void>;
  updateUser: (nextUser: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type AuthProviderProps = {
  children: ReactNode;
};

const clearStoredSession = () =>
  AsyncStorage.multiRemove([AUTH_STORAGE_KEYS.user, AUTH_STORAGE_KEYS.token]);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const sessionVersion = useRef(0);
  const signingIn = useRef(false);

  const clearSessionState = useCallback(() => {
    api.clearToken();
    setUser(null);
    setToken(null);
  }, []);

  const checkAuth = useCallback(async () => {
    if (signingIn.current) return;
    const version = ++sessionVersion.current;
    setLoading(true);
    try {
      const storedValues = await AsyncStorage.multiGet([
        AUTH_STORAGE_KEYS.user,
        AUTH_STORAGE_KEYS.token,
      ]);
      const storedSession = parseStoredAuthSession(
        storedValues[0]?.[1] ?? null,
        storedValues[1]?.[1] ?? null
      );
      if (version !== sessionVersion.current) return;

      if (!storedSession) {
        clearSessionState();
        await clearStoredSession();
        return;
      }

      api.setToken(storedSession.token);
      // A saved token is only a candidate session until the server accepts it.
      const response = await api.authGet<{ data: AuthUser | null }>(
        '/user/profile',
        false
      );
      if (version !== sessionVersion.current) return;
      if (!response.data?.id ||
          (storedSession.user.id && response.data.id !== storedSession.user.id)) {
        throw new ApiError('Saved account is no longer available', 401);
      }
      setUser(storedSession.user);
      setToken(storedSession.token);
    } catch (error) {
      if (version !== sessionVersion.current) return;
      clearSessionState();
      if (error instanceof ApiError && [401, 404].includes(error.status)) {
        await clearStoredSession().catch(() => {});
      }
      log.warn(
        'Unable to restore the saved session',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      if (version === sessionVersion.current) setLoading(false);
    }
  }, [clearSessionState]);

  const login = useCallback(async (credentials: LoginRequest) => {
    signingIn.current = true;
    const version = ++sessionVersion.current;
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      const session = extractAuthSession(response);
      if (version !== sessionVersion.current) return;
      if (!session) {
        throw new Error('The server returned an invalid login response.');
      }

      await AsyncStorage.multiSet([
        [AUTH_STORAGE_KEYS.user, JSON.stringify(session.user)],
        [AUTH_STORAGE_KEYS.token, session.token],
      ]);
      if (version !== sessionVersion.current) return;

      api.setToken(session.token);
      setUser(session.user);
      setToken(session.token);
    } finally {
      signingIn.current = false;
      setIsLoading(false);
      if (version === sessionVersion.current) setLoading(false);
    }
  }, []);

  const register = useCallback(async (details: RegisterRequest) => {
    setIsLoading(true);
    try {
      // Registration does not create local authenticated state. The user signs
      // in explicitly after account creation, matching the registration flow.
      await authApi.register(details);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (nextUser: AuthUser) => {
    setUser(nextUser);
    try {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEYS.user,
        JSON.stringify(nextUser)
      );
    } catch (error) {
      log.warn(
        'Unable to update the saved user profile',
        error instanceof Error ? error.message : String(error)
      );
    }
  }, []);

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    setLoading(false);
    // Clear in-memory credentials first so a storage failure can never leave
    // protected screens or authenticated API calls available in this session.
    clearSessionState();

    try {
      await clearStoredSession();
    } catch (error) {
      log.warn(
        'Unable to remove the saved session',
        error instanceof Error ? error.message : String(error)
      );
    }
  }, [clearSessionState]);

  useEffect(() => {
    api.setSessionInvalidationHandler(() => { void logout(); });
    void checkAuth();
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', state => {
      const returning = previousState !== 'active' && state === 'active';
      previousState = state;
      if (returning) void checkAuth();
    });
    return () => {
      api.setSessionInvalidationHandler(undefined);
      subscription.remove();
    };
  }, [checkAuth, logout]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      updateUser,
      logout,
    }),
    [user, token, loading, isLoading, login, register, updateUser, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
