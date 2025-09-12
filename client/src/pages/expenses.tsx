import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, ArrowUpDown, Utensils, Car, Bed, ShoppingBag, Gamepad2, MoreHorizontal } from "lucide-react";

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

export default function Expenses() {
  const { activeGroupId, currentUserId } = useAppContext();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/groups", activeGroupId, "expenses"],
    enabled: !!activeGroupId,
  });

  const getUserById = (id: string) => users.find(u => u.id === id);

  const getExpenseIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "food": case "food & dining": return Utensils;
      case "transportation": return Car;
      case "accommodation": return Bed;
      case "shopping": return ShoppingBag;
      case "entertainment": return Gamepad2;
      default: return MoreHorizontal;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "food": case "food & dining": return "bg-orange-100 text-orange-800";
      case "transportation": return "bg-blue-100 text-blue-800";
      case "accommodation": return "bg-purple-100 text-purple-800";
      case "shopping": return "bg-green-100 text-green-800";
      case "entertainment": return "bg-pink-100 text-pink-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="mx-4 mt-4" data-testid="expenses-view">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">All Expenses</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" data-testid="button-filter-expenses">
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" data-testid="button-sort-expenses">
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No expenses yet</h3>
              <p className="text-sm text-muted-foreground">
                Start by adding your first expense to track group spending
              </p>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => {
            const paidByUser = getUserById(expense.paidBy);
            const userSplit = expense.splits.find(s => s.userId === currentUserId);
            const yourShare = userSplit?.amount || 0;
            const Icon = getExpenseIcon(expense.category);

            return (
              <Card key={expense.id} data-testid={`card-expense-${expense.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{expense.description}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Paid by <span className="font-medium">{paidByUser?.name}</span> on{" "}
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="secondary" className={getCategoryColor(expense.category)}>
                            {expense.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-foreground">
                        ${parseFloat(expense.amount).toFixed(2)}
                      </div>
                      {expense.paidBy === currentUserId ? (
                        <div className="text-sm expense-positive">
                          You paid
                        </div>
                      ) : (
                        <div className="text-sm expense-negative">
                          You owe ${yourShare.toFixed(2)}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-primary text-sm h-auto p-0"
                        data-testid={`button-edit-expense-${expense.id}`}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
