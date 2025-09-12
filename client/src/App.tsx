import { Switch, Route } from "wouter";
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
import BottomNavigation from "@/components/bottom-navigation";
import Header from "@/components/header";
import { AppContext } from "@/context/app-context";

function App() {
  const [activeGroupId, setActiveGroupId] = useState("demo-group");
  const currentUserId = "demo-user"; // In a real app, this would come from authentication

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContext.Provider value={{ activeGroupId, setActiveGroupId, currentUserId }}>
          <div className="max-w-md mx-auto bg-background shadow-2xl min-h-screen relative">
            <Header />
            <main className="pb-20">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/expenses" component={Expenses} />
                <Route path="/add-expense" component={AddExpense} />
                <Route path="/groups" component={Groups} />
                <Route path="/profile" component={Profile} />
                <Route component={NotFound} />
              </Switch>
            </main>
            <BottomNavigation />
          </div>
          <Toaster />
        </AppContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
