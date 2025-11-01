import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User } from '../../../shared/schema';
// 1. Import from your new token store
import { setAuthToken, getAuthToken as getTokenFromStore } from '../lib/tokenStore';

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
  getToken: () => string | null;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // 2. Initialize state from the global store
  const [token, _setToken] = useState<string | null>(() => getTokenFromStore());

  const location = useLocation();
  const navigate = useNavigate();

  const apiBaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL)
    ? (import.meta as any).env.VITE_API_URL
    : 'http://localhost:5001';

  // 3. Create a new setToken function that updates both stores
  const setToken = (newToken: string | null) => {
    setAuthToken(newToken); // Update global store
    _setToken(newToken);   // Update React state
  };

  const getToken = () => token;

  // Capture token from URL on load
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenFromUrl = searchParams.get('token');

    if (tokenFromUrl) {
      setToken(tokenFromUrl); // Use our new setter
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]); // Removed navigate dependency

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsLoading(false);
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      setIsLoading(true);
      try {
        // 4. Use raw axios, not the instance, to avoid interceptor loop
        const response = await axios.get<User>(`${apiBaseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        setIsAuthenticated(false);
        setToken(null); // Clear the bad token
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [token, apiBaseUrl]);

  const login = async (username: string, password: string) => {
    const response = await axios.post<{ token: string; user: User }>(`${apiBaseUrl}/api/auth/login`, { username, password });
    const { token: newToken, user } = response.data;
    setToken(newToken); // Use our new setter
    setUser(user);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  // 5. REVERT to your original register logic
  const register = async (userData: RegisterData) => {
    // This will now work because the server returns { token, user }
    const response = await axios.post<{ token: string; user: User }>(`${apiBaseUrl}/api/auth/register`, userData);
    const { token: newToken, user } = response.data;
    setToken(newToken);
    setUser(user);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const logout = () => {
    setToken(null); // Use our new setter
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login'); // Redirect to login
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
