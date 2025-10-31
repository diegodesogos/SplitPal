import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";
import Dashboard from "@/pages/dashboard";
import Expenses from "@/pages/expenses";
import AddExpense from "@/pages/add-expense";
import Groups from "@/pages/groups";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import BottomNavigation from "@/components/bottom-navigation";
import Header from "@/components/header";
import { AppContext } from "@/context/app-context";
import { AuthProvider } from "@/context/auth-provider";
import { useAuth } from "@/context/auth-provider";

// Auth-aware route component that redirects to login if not authenticated
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation(); // Get current location

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login, passing the current location in state
    // so we can redirect back after login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// NEW: Create a component for the main app layout
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-md mx-auto bg-background shadow-2xl min-h-screen relative">
    <Header />
    <main className="pb-20">
      {children}
    </main>
    <BottomNavigation />
  </div>
);


function AuthenticatedApp() {
  const [activeGroupId, setActiveGroupId] = useState("demo-group");
  const { user, isAuthenticated } = useAuth(); // Get isAuthenticated
  const currentUserId = user?.id || "";

  return (
    <AppContext.Provider value={{ activeGroupId, setActiveGroupId, currentUserId }}>
      {/* Move Header and BottomNav into a layout component */}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes wrapped in AppLayout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout><Dashboard /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <AppLayout><Expenses /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-expense"
          element={
            <ProtectedRoute>
              <AppLayout><AddExpense /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <AppLayout><Groups /></AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout><Profile /></AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Root redirect logic */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        {/* 404 Not Found Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </AppContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
