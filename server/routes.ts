import type { Express, Request, Response } from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage.js";
import { 
  insertGroupSchema, 
  insertExpenseSchema, 
  insertSettlementSchema,
  registerUserSchema,
  loginUserSchema
} from "@shared/schema.js";
import { useAuthorization, checkAbility, AppUser } from "./authorization.js";

export function registerRoutes(app: Express): void {
  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        hashedPassword,
        provider: 'password',
        role: 'member'
      });

      // Create auth token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Set cookie with JWT
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Respond with user data (excluding hashed password)
      const { hashedPassword: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to register user' 
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginUserSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user || !user.hashedPassword) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Update last login time
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role }, 
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Set cookie with JWT
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Send user data (excluding hashed password)
      const { hashedPassword: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ message: 'Failed to login' });
    }
  });
  app.get('/api/auth/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ 
        message: 'Google authentication is not configured',
        details: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables'
      });
    }
    passport.authenticate('google', { 
      scope: ['profile', 'email']
    })(req, res, next);
  });

  app.get('/api/auth/google/callback', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ 
        message: 'Google authentication is not configured',
        details: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables'
      });
    }
    passport.authenticate('google', { 
      failureRedirect: '/login',
      successRedirect: '/'
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', useAuthorization(), (req, res) => {
    res.json(req.user);
  });

  // User routes (protected)
  app.get("/api/users", useAuthorization(), checkAbility('read', 'User'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter out sensitive data for non-admin users
      const filteredUsers = users.map(user => ({
        id: user.id,
        name: user.name
      }));
      res.json(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", useAuthorization(), checkAbility('read', 'User'), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If user is requesting their own profile or is admin, return full profile
      const currentUser = req.user as AppUser;
      const canViewFull = currentUser.id === user.id || currentUser.role === 'admin';
      const filteredUser = canViewFull ? user : {
        id: user.id,
        name: user.name
      };
      
      res.json(filteredUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Group routes
  app.get("/api/groups", useAuthorization(), checkAbility('read', 'Group'), async (req, res) => {
    try {
      // For non-admin users, only return groups they participate in
      const user = req.user as AppUser;
      const groups = await (user.role === 'admin' 
        ? storage.getAllGroups()
        : storage.getUserGroups(user.id));
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.get("/api/groups/:id", useAuthorization(), checkAbility('read', 'Group'), async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if user can access this specific group
      if (!req.ability?.can('read', {
        ...group,
        subject: 'Group'
      })) {
        return res.status(403).json({ message: "You don't have access to this group" });
      }

      res.json(group);
    } catch (error) {
      console.error("Error fetching group:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  app.post("/api/groups", useAuthorization(), checkAbility('create', 'Group'), async (req, res) => {
    try {
      const validated = insertGroupSchema.parse(req.body);
      const user = req.user as AppUser;
      
      // Initialize participants array if not present
      validated.participants = validated.participants || [];
      
      // Ensure current user is added as a participant
      if (!validated.participants.includes(user.id)) {
        validated.participants.push(user.id);
      }
      
      const group = await storage.createGroup(validated);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      const message = error instanceof Error ? error.message : "Invalid group data";
      res.status(400).json({ message });
    }
  });

  app.put("/api/groups/:id", useAuthorization(), checkAbility('update', 'Group'), async (req, res) => {
    try {
      // First fetch the existing group
      const existing = await storage.getGroup(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if user can update this specific group
      if (!req.ability!.can('update', {
        ...existing,
        subject: 'Group' // Tell CASL this is a Group resource
      })) {
        return res.status(403).json({ message: "You don't have permission to update this group" });
      }

      const group = await storage.updateGroup(req.params.id, req.body);
      res.json(group);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(400).json({ message: "Failed to update group" });
    }
  });

  app.get("/api/users/:userId/groups", useAuthorization(), async (req, res) => {
    try {
      // Users can only view their own groups unless they're admin
      if (req.user!.role !== 'admin' && req.user!.id !== req.params.userId) {
        return res.status(403).json({ message: "You can only view your own groups" });
      }

      const groups = await storage.getUserGroups(req.params.userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  // Expense routes
  app.get("/api/groups/:groupId/expenses", useAuthorization(), checkAbility('read', 'Expense'), async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if user can access this group's expenses
      if (!req.ability!.can('read', {
        groupId: req.params.groupId,
        subject: 'Expense'
      })) {
        return res.status(403).json({ message: "You don't have access to this group's expenses" });
      }

      const expenses = await storage.getGroupExpenses(req.params.groupId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", useAuthorization(), checkAbility('read', 'Expense'), async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Check if user can access this specific expense
      if (!req.ability!.can('read', {
        ...expense,
        subject: 'Expense'
      })) {
        return res.status(403).json({ message: "You don't have access to this expense" });
      }

      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", useAuthorization(), checkAbility('create', 'Expense'), async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);

      // Check if user can create expense in this group
      if (!req.ability!.can('create', {
        groupId: validated.groupId,
        subject: 'Expense'
      })) {
        return res.status(403).json({ message: "You don't have permission to create expenses in this group" });
      }

      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      const message = error instanceof Error ? error.message : "Invalid expense data";
      res.status(400).json({ message });
    }
  });

  app.put("/api/expenses/:id", useAuthorization(), checkAbility('update', 'Expense'), async (req, res) => {
    try {
      const existing = await storage.getExpense(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Check if user can update this specific expense
      if (!req.ability!.can('update', {
        ...existing,
        subject: 'Expense'
      })) {
        return res.status(403).json({ message: "You don't have permission to update this expense" });
      }

      const expense = await storage.updateExpense(req.params.id, req.body);
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      const message = error instanceof Error ? error.message : "Failed to update expense";
      res.status(400).json({ message });
    }
  });

  app.delete("/api/expenses/:id", useAuthorization(), checkAbility('delete', 'Expense'), async (req, res) => {
    try {
      const existing = await storage.getExpense(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Expense not found" });
      }

      // Check if user can delete this specific expense
      if (!req.ability!.can('delete', {
        ...existing,
        subject: 'Expense'
      })) {
        return res.status(403).json({ message: "You don't have permission to delete this expense" });
      }

      const deleted = await storage.deleteExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Settlement routes
  app.get("/api/groups/:groupId/settlements", useAuthorization(), checkAbility('read', 'Settlement'), async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if user can access this group's settlements
      if (!req.ability!.can('read', {
        groupId: req.params.groupId,
        subject: 'Settlement'
      })) {
        return res.status(403).json({ message: "You don't have access to this group's settlements" });
      }

      const settlements = await storage.getGroupSettlements(req.params.groupId);
      res.json(settlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      res.status(500).json({ message: "Failed to fetch settlements" });
    }
  });

  app.post("/api/settlements", useAuthorization(), checkAbility('create', 'Settlement'), async (req, res) => {
    try {
      const validated = insertSettlementSchema.parse(req.body);

      // Check if user can create settlement in this group
      if (!req.ability!.can('create', {
        groupId: validated.groupId,
        subject: 'Settlement'
      })) {
        return res.status(403).json({ message: "You don't have permission to create settlements in this group" });
      }

      const settlement = await storage.createSettlement(validated);
      res.status(201).json(settlement);
    } catch (error) {
      console.error("Error creating settlement:", error);
      const message = error instanceof Error ? error.message : "Invalid settlement data";
      res.status(400).json({ message });
    }
  });

  app.get("/api/users/:userId/groups", useAuthorization(), async (req, res) => {
    try {
      // Users can only view their own groups unless they're admin
      if (req.user?.role !== 'admin' && req.user?.id !== req.params.userId) {
        return res.status(403).json({ message: "You can only view your own groups" });
      }

      const groups = await storage.getUserGroups(req.params.userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  // Expense routes
  app.get("/api/groups/:groupId/expenses", async (req, res) => {
    try {
      const expenses = await storage.getGroupExpenses(req.params.groupId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
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
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      const message = error instanceof Error ? error.message : "Invalid expense data";
      res.status(400).json({ message });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.updateExpense(req.params.id, req.body);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      const message = error instanceof Error ? error.message : "Failed to update expense";
      res.status(400).json({ message });
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
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Settlement routes
  app.get("/api/groups/:groupId/settlements", useAuthorization(), checkAbility('read', 'Settlement'), async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Check if user can access this group's settlements
      if (!req.ability!.can('read', {
        groupId: group.id,
        subject: 'Settlement'
      })) {
        return res.status(403).json({ message: "You don't have access to this group's settlements" });
      }

      const settlements = await storage.getGroupSettlements(req.params.groupId);
      res.json(settlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      res.status(500).json({ message: "Failed to fetch settlements" });
    }
  });

  app.post("/api/settlements", useAuthorization(), checkAbility('create', 'Settlement'), async (req, res) => {
    try {
      const validated = insertSettlementSchema.parse(req.body);

      // Check if user can create settlements in this group
      if (!req.ability!.can('create', {
        groupId: validated.groupId,
        subject: 'Settlement'
      })) {
        return res.status(403).json({ message: "You don't have permission to create settlements in this group" });
      }

      const settlement = await storage.createSettlement(validated);
      res.status(201).json(settlement);
    } catch (error) {
      console.error("Error creating settlement:", error);
      const message = error instanceof Error ? error.message : "Invalid settlement data";
      res.status(400).json({ message });
    }
  });

  // Balance calculation endpoint
  app.get("/api/groups/:groupId/balances", async (req, res) => {
    try {
      const [expenses, settlements, group] = await Promise.all([
        storage.getGroupExpenses(req.params.groupId),
        storage.getGroupSettlements(req.params.groupId),
        storage.getGroup(req.params.groupId)
      ]);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Calculate balances
      const balances: Record<string, number> = {};
      
      // Initialize balances for all participants
      group.participants.forEach((userId: string | number) => {
        balances[userId] = 0;
      });

      // Process expenses
      expenses.forEach((expense: { amount: string; paidBy: string | number; splits: any[]; }) => {
        const amount = parseFloat(expense.amount);
        
        // The person who paid gets credited
        balances[expense.paidBy] += amount;
        
        // Everyone who owes gets debited based on their split
        expense.splits.forEach((split: { userId: string | number; amount: number; }) => {
          balances[split.userId] -= split.amount;
        });
      });

      // Process settlements
      settlements.forEach((settlement: { amount: string; fromUserId: string | number; toUserId: string | number; }) => {
        const amount = parseFloat(settlement.amount);
        balances[settlement.fromUserId] += amount;
        balances[settlement.toUserId] -= amount;
      });

      res.json(balances);
    } catch (error) {
      console.error("Error calculating balances:", error);
      res.status(500).json({ message: "Failed to calculate balances" });
    }
  });
}
