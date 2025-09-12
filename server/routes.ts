import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGroupSchema, insertExpenseSchema, insertSettlementSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users", async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Group routes
  app.get("/api/groups", async (_req, res) => {
    try {
      const groups = await storage.getAllGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const validated = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(validated);
      res.status(201).json(group);
    } catch (error) {
      res.status(400).json({ message: "Invalid group data" });
    }
  });

  app.put("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.updateGroup(req.params.id, req.body);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(400).json({ message: "Failed to update group" });
    }
  });

  app.get("/api/users/:userId/groups", async (req, res) => {
    try {
      const groups = await storage.getUserGroups(req.params.userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  // Expense routes
  app.get("/api/groups/:groupId/expenses", async (req, res) => {
    try {
      const expenses = await storage.getGroupExpenses(req.params.groupId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      console.log("Expense creation request body:", JSON.stringify(req.body, null, 2));
      const validated = insertExpenseSchema.parse(req.body);
      console.log("Validated expense data:", JSON.stringify(validated, null, 2));
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Expense validation error:", error);
      res.status(400).json({ message: "Invalid expense data", error: error.message });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      console.log("Expense update request:", req.params.id, JSON.stringify(req.body, null, 2));
      const expense = await storage.updateExpense(req.params.id, req.body);
      if (!expense) {
        console.log("Expense not found:", req.params.id);
        return res.status(404).json({ message: "Expense not found" });
      }
      console.log("Expense updated successfully:", JSON.stringify(expense, null, 2));
      res.json(expense);
    } catch (error) {
      console.error("Expense update error:", error);
      res.status(400).json({ message: "Failed to update expense", error: error.message });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Settlement routes
  app.get("/api/groups/:groupId/settlements", async (req, res) => {
    try {
      const settlements = await storage.getGroupSettlements(req.params.groupId);
      res.json(settlements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settlements" });
    }
  });

  app.post("/api/settlements", async (req, res) => {
    try {
      const validated = insertSettlementSchema.parse(req.body);
      const settlement = await storage.createSettlement(validated);
      res.status(201).json(settlement);
    } catch (error) {
      res.status(400).json({ message: "Invalid settlement data" });
    }
  });

  // Balance calculation endpoint
  app.get("/api/groups/:groupId/balances", async (req, res) => {
    try {
      const expenses = await storage.getGroupExpenses(req.params.groupId);
      const settlements = await storage.getGroupSettlements(req.params.groupId);
      const group = await storage.getGroup(req.params.groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Calculate balances
      const balances: Record<string, number> = {};
      
      // Initialize balances for all participants
      group.participants.forEach(userId => {
        balances[userId] = 0;
      });

      // Process expenses
      expenses.forEach(expense => {
        const amount = parseFloat(expense.amount);
        
        // The person who paid gets credited
        balances[expense.paidBy] += amount;
        
        // Everyone who owes gets debited based on their split
        expense.splits.forEach(split => {
          balances[split.userId] -= split.amount;
        });
      });

      // Process settlements
      settlements.forEach(settlement => {
        const amount = parseFloat(settlement.amount);
        balances[settlement.fromUserId] += amount;
        balances[settlement.toUserId] -= amount;
      });

      res.json(balances);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate balances" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
