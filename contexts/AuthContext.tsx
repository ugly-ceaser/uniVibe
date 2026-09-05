import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, authApi } from '@/utils/api';
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

  const clearSessionState = useCallback(() => {
    api.clearToken();
    setUser(null);
    setToken(null);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const storedValues = await AsyncStorage.multiGet([
        AUTH_STORAGE_KEYS.user,
        AUTH_STORAGE_KEYS.token,
      ]);
      const storedSession = parseStoredAuthSession(
        storedValues[0]?.[1] ?? null,
        storedValues[1]?.[1] ?? null
      );

      if (!storedSession) {
        await clearStoredSession();
        clearSessionState();
        return;
      }

      api.setToken(storedSession.token);
      setUser(storedSession.user);
      setToken(storedSession.token);
    } catch (error) {
      clearSessionState();
      log.warn(
        'Unable to restore the saved session',
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      setLoading(false);
    }
  }, [clearSessionState]);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      const session = extractAuthSession(response);
      if (!session) {
        throw new Error('The server returned an invalid login response.');
      }

      await AsyncStorage.multiSet([
        [AUTH_STORAGE_KEYS.user, JSON.stringify(session.user)],
        [AUTH_STORAGE_KEYS.token, session.token],
      ]);

      api.setToken(session.token);
      setUser(session.user);
      setToken(session.token);
    } finally {
      setIsLoading(false);
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
    void checkAuth();
  }, [checkAuth]);

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
