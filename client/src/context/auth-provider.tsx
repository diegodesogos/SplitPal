import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { User } from '../../../shared/schema';

// Type for registration data
export interface RegisterData {
  username: string;
  password: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  getToken: () => string | null; // New function to expose token
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Configure axios base URL
  const apiBaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL)
    ? (import.meta as any).env.VITE_API_URL
    : 'http://localhost:5001';

  // Function to expose the current token
  const getToken = () => token;

  // Check authentication status on mount (if token exists in memory)
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        return;
      }
      try {
        setIsAuthenticated(true); // Set true if token exists and is valid
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
    // Only run when token changes
  }, [token]);

  const login = async (username: string, password: string) => {
    const response = await axios.post<{ token: string; user: User }>(`${apiBaseUrl}/api/auth/login`, { username, password });
    const { token: newToken, user } = response.data;
    setToken(newToken);
    setUser(user);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const register = async (userData: RegisterData) => {
    const response = await axios.post<{ token: string; user: User }>(`${apiBaseUrl}/api/auth/register`, userData);
    const { token: newToken, user } = response.data;
    setToken(newToken);
    setUser(user);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, token, login, logout, register, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}