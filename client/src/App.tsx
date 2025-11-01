import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"; // <-- FIX: Added useNavigate
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
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

// --- Add this interface ---
interface Group {
  id: string;
  name: string;
  participants: string[];
}

function AuthenticatedApp() {
  const [activeGroupId, setActiveGroupId] = useState(""); // <-- FIX 1: Default to empty
  const { user, isAuthenticated, isLoading } = useAuth(); // Get isAuthenticated
  const currentUserId = user?.id || "";
  const navigate = useNavigate(); // <-- Add navigate
  const location = useLocation(); // <-- Add location

  // --- START: MODIFIED SECTION ---
  // Query for user's groups
  const { data: groups, isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/users", currentUserId, "groups"], // <-- FIX: Add /api prefix
    enabled: !!currentUserId && isAuthenticated, // Only run when fully authenticated
  });

  // Effect to manage group state and redirects
  useEffect(() => {
    // Wait for auth and group data to finish loading
    if (isLoading || groupsLoading) {
      return; 
    }

    if (isAuthenticated && user) {
      if (groups && groups.length > 0) {
        // User has groups. Set active group if not already set or invalid
        const currentGroupIsValid = groups.some(g => g.id === activeGroupId);
        if (!activeGroupId || !currentGroupIsValid) {
          setActiveGroupId(groups[0].id);
        }
      } else if (groups && groups.length === 0) {
        // User has no groups, redirect to create one
        // unless they are already on that page
        if (location.pathname !== '/groups') {
          navigate('/groups', { replace: true });
        }
      }
    }
  }, [
    user, 
    isAuthenticated, 
    isLoading, 
    groups, 
    groupsLoading, 
    activeGroupId, 
    navigate,
    location.pathname
  ]);
  // --- END: MODIFIED SECTION ---

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
            isLoading ? <div>Loading...</div> : // <-- Add loading check for root redirect
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
