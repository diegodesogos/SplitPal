import { createContext, useContext } from "react";

export type Role = 'admin' | 'member' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: Role;
  lastLoginAt?: Date;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};