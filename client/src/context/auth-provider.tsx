import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, AuthUser } from "./auth-context";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        if (response.status === 401) {
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
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Login failed");
        }

        const userData = await response.json();
        setUser(userData);
        navigate("/");
      } else {
        // OAuth login
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
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to logout");
      }
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