import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { authApi } from '@/utils/api';

type AuthContextType = {
  user: any;
  token: string | null;
  loading: boolean;
  isLoading: boolean;
  login: (userData: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // ✅ useCallback ensures stable function identity
  const checkAuth = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('token');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
      if (storedToken) {
        setToken(storedToken);
      } else {
        setToken(null);
      }
    } catch (err) {
      console.error('Error checking auth:', err);
      Alert.alert('Error', 'Failed to check authentication');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(userData);
      const { user: userData, token: authToken } = response.data;
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('token', authToken);
      
      setUser(userData);
      setToken(authToken);
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'Failed to log in');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: { name: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(userData);
      const { user: newUser, token: authToken } = response.data;
      
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      await AsyncStorage.setItem('token', authToken);
      
      setUser(newUser);
      setToken(authToken);
    } catch (err) {
      console.error('Register error:', err);
      Alert.alert('Error', 'Failed to register');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error('Logout error:', err);
      Alert.alert('Error', 'Failed to log out');
    }
  }, []);

  // ✅ Dependency array now safe — no warning
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
