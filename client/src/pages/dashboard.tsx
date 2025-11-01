import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SettlementModal from "@/components/settlement-modal";
import { useState } from "react";
import { Utensils, Car, Bed } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Expense {
  id: string;
  description: string;
  amount: string;
  paidBy: string;
  category: string;
  date: string;
  splits: { userId: string; amount: number }[];
}

interface Group {
  id: string;
  name: string;
  participants: string[];
}

export default function Dashboard() {
  const { activeGroupId, currentUserId } = useAppContext();
  const [settlementModal, setSettlementModal] = useState<{
    isOpen: boolean;
    fromUser?: User;
    toUser?: User;
    suggestedAmount?: number;
  }>({ isOpen: false });

  const { data: group } = useQuery<Group>({
    queryKey: ["/api/groups", activeGroupId], // FIX: Added /api prefix
    enabled: !!activeGroupId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"], // FIX: Added /api prefix
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/groups", activeGroupId, "expenses"], // FIX: Added /api prefix
    enabled: !!activeGroupId,
  });

  const { data: balances = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/groups", activeGroupId, "balances"], // FIX: Added /api prefix
    enabled: !!activeGroupId,
  });

  const currentUser = users.find(u => u.id === currentUserId);
  const userBalance = balances[currentUserId] || 0;
  const recentExpenses = expenses.slice(-3).reverse();

  const getUserById = (id: string) => users.find(u => u.id === id);

  const getExpenseIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "food": case "food & dining": return Utensils;
      case "transportation": return Car;
      case "accommodation": return Bed;
      default: return Utensils;
    }
  };

  const handleSettleUp = () => {
    if (!currentUser) return;
    
    // Find the user we owe the most to (or who owes us the most)
    const participantBalances = group?.participants
      .filter(id => id !== currentUserId)
      .map(id => ({
        user: getUserById(id),
        balance: balances[id] || 0
      }))
      .filter(p => p.user) || [];

    if (participantBalances.length === 0) return;

    // If we have negative balance, find who we owe most to
    // If we have positive balance, find who owes us most
    const target = userBalance < 0 
      ? participantBalances.reduce((max, p) => p.balance > max.balance ? p : max)
      : participantBalances.reduce((max, p) => p.balance < max.balance ? p : max);

    const amount = userBalance < 0 ? Math.abs(userBalance) : Math.abs(target.balance);

    setSettlementModal({
      isOpen: true,
      fromUser: userBalance < 0 ? currentUser : target.user!,
      toUser: userBalance < 0 ? target.user! : currentUser,
      suggestedAmount: amount,
    });
  };

  const handleSettleWith = (userId: string) => {
    if (!currentUser) return;
    
    const otherUser = getUserById(userId);
    if (!otherUser) return;

    const otherBalance = balances[userId] || 0;
    const amount = Math.abs(userBalance - otherBalance) / 2;

    setSettlementModal({
      isOpen: true,
      fromUser: userBalance < otherBalance ? currentUser : otherUser,
      toUser: userBalance < otherBalance ? otherUser : currentUser,
      suggestedAmount: amount,
    });
  };

  return (
    <>
      <div className="space-y-4" data-testid="dashboard-view">
        {/* Balance Overview Card */}
        <div className="mx-4 mt-4 bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Your Balance</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={handleSettleUp}
              data-testid="button-settle-up"
            >
              Settle Up
            </Button>
          </div>
          <div className="text-center py-4">
            <div 
              className={`text-3xl font-bold ${userBalance >= 0 ? 'expense-positive' : 'expense-negative'}`}
              data-testid="text-user-balance"
            >
              {userBalance >= 0 ? '+' : ''}${Math.abs(userBalance).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {userBalance >= 0 ? 'You are owed overall' : 'You owe overall'}
            </p>
          </div>
        </div>

        {/* Participants & Balances */}
        <div className="mx-4 bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Group Balances</h3>
          </div>
          <div className="divide-y divide-border">
            {group?.participants
              .filter(id => id !== currentUserId)
              .map((userId) => {
                const user = getUserById(userId);
                const balance = balances[userId] || 0;
                if (!user) return null;

                return (
                  <div key={userId} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-medium text-sm">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div 
                        className={`font-semibold ${balance >= 0 ? 'expense-positive' : 'expense-negative'}`}
                        data-testid={`text-balance-${userId}`}
                      >
                        {balance >= 0 ? '+' : ''}${Math.abs(balance).toFixed(2)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary h-auto p-0"
                        onClick={() => handleSettleWith(userId)}
                        data-testid={`button-settle-with-${userId}`}
                      >
                        Settle
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="mx-4 bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Recent Expenses</h3>
              <Button variant="ghost" size="sm" className="text-primary" data-testid="button-view-all-expenses">
                View All
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {recentExpenses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No expenses yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first expense to get started</p>
              </div>
            ) : (
              recentExpenses.map((expense) => {
                const paidByUser = getUserById(expense.paidBy);
                const userSplit = expense.splits.find(s => s.userId === currentUserId);
                const yourShare = userSplit?.amount || 0;
                const Icon = getExpenseIcon(expense.category);

                return (
                  <div key={expense.id} className="p-4" data-testid={`expense-item-${expense.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            Paid by {paidByUser?.name} • {new Date(expense.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">${parseFloat(expense.amount).toFixed(2)}</div>
                        {expense.paidBy === currentUserId ? (
                          <div className="text-sm expense-positive">
                            You paid
                          </div>
                        ) : (
                          <div className="text-sm expense-negative">
                            You owe ${yourShare.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <SettlementModal
        isOpen={settlementModal.isOpen}
        onClose={() => setSettlementModal({ isOpen: false })}
        fromUser={settlementModal.fromUser}
        toUser={settlementModal.toUser}
        suggestedAmount={settlementModal.suggestedAmount}
      />
    </>
  );
}
