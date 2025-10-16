import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, AuthUser } from "./auth-context";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('jwt_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      checkAuth();
    }
  }, []);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        setUser(null);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('jwt_token');
          setUser(null);
          return;
        }
        throw new Error("Failed to get user info");
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username?: string, password?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (username && password) {
        // Username/password login
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Login failed");
        }

        const { token, user: userData } = await response.json();
        localStorage.setItem('jwt_token', token);
        setUser(userData);
        navigate("/");
      } else {
        // OAuth login - will receive token in redirect URL
        window.location.href = "/api/auth/google";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('jwt_token');
      setUser(null);
      navigate("/login");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to logout");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};