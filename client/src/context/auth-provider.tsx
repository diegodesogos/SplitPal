import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // Import react-router-dom hooks
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

  // Hooks from react-router-dom
  const location = useLocation();
  const navigate = useNavigate();

  // Configure axios base URL
  const apiBaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL)
    ? (import.meta as any).env.VITE_API_URL
    : 'http://localhost:5001';

  // Function to expose the current token
  const getToken = () => token;

  // NEW HOOK: Capture token from URL on load
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenFromUrl = searchParams.get('token');

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      // Clean the URL so the token isn't visible anymore
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]); // This hook runs when location changes

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
        // If we have a token, we are authenticated.
        // For higher security, you could add a /api/auth/me call here
        // to verify the token with the backend.
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
    // This effect now correctly runs when the token state is set
  }, [token]);

  const login = async (username: string, password: string) => {
    // ... (no changes to login function)
    const response = await axios.post<{ token: string; user: User }>(`${apiBaseUrl}/api/auth/login`, { username, password });
    const { token: newToken, user } = response.data;
    setToken(newToken);
    setUser(user);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const register = async (userData: RegisterData) => {
    // ... (no changes to register function)
    const response = await axios.post<{ token: string; user: User }>(`${apiBaseUrl}/api/auth/register`, userData);
    const { token: newToken, user } = response.data;
    setToken(newToken);
    setUser(user);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const logout = () => {
    // ... (no changes to logout function)
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
