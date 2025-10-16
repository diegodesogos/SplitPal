import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../context/auth-provider";
import { Filter, ArrowUpDown, Utensils, Car, Bed, ShoppingBag, Gamepad2, MoreHorizontal, Trash2 } from "lucide-react";

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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { axiosWithAuth } = useAuth();

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

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: { id: string; description: string; amount: string; category: string }) => {
      const response = await axiosWithAuth.put(`/api/expenses/${data.id}`,
        {
          description: data.description,
          amount: data.amount,
          category: data.category,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", activeGroupId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", activeGroupId, "balances"] });
      toast({
        title: "Success",
        description: "Expense updated successfully!",
      });
      setEditingExpense(null);
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await axiosWithAuth.delete(`/api/expenses/${expenseId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", activeGroupId, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", activeGroupId, "balances"] });
      toast({
        title: "Success",
        description: "Expense deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditDescription(expense.description);
    setEditAmount(expense.amount);
    setEditCategory(expense.category);
  };

  const handleUpdateExpense = () => {
    if (!editingExpense || !editDescription || !editAmount || !editCategory) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    updateExpenseMutation.mutate({
      id: editingExpense.id,
      description: editDescription,
      amount: editAmount,
      category: editCategory,
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(expenseId);
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
                      <div className="flex space-x-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary text-sm h-auto p-0"
                          onClick={() => handleEditExpense(expense)}
                          data-testid={`button-edit-expense-${expense.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive text-sm h-auto p-0"
                          onClick={() => handleDeleteExpense(expense.id)}
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent data-testid="dialog-edit-expense">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                data-testid="input-expense-description"
              />
            </div>
            <div>
              <Label htmlFor="edit-amount">Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                data-testid="input-expense-amount"
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Category *</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                  <SelectItem value="Transportation">Transportation</SelectItem>
                  <SelectItem value="Accommodation">Accommodation</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Shopping">Shopping</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleUpdateExpense}
                disabled={updateExpenseMutation.isPending}
                data-testid="button-save-expense"
              >
                {updateExpenseMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingExpense(null)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
