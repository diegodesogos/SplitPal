import type { Express, Request, Response } from "express";
import passport from "passport";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import { storage } from "./storage.js";
import { generateToken, AuthResponse } from './auth.js';
import { 
  insertGroupSchema, 
  insertExpenseSchema, 
  insertSettlementSchema,
  registerUserSchema,
  loginUserSchema
} from "@shared/schema.js";
import { useAuthorization, checkAbility, AppUser } from "./authorization.js";

// --- Add this constant ---
const FRONTEND_URL_DEF = process.env.FRONTEND_URL || 'http://localhost:3001';

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

      // --- START: MODIFIED SECTION ---
      // FIX: Generate a token and return the full AuthResponse
      const token = generateToken(user);
      const { hashedPassword: _, ...userWithoutPassword } = user;

      res.status(201).json({
        user: userWithoutPassword,
        token: token
      } as AuthResponse);
      // --- END: MODIFIED SECTION ---
      
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
      // Note: You may want to await this, but not critical for the response
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Generate a token and return the correct AuthResponse ---
      const token = generateToken(user);
      const { hashedPassword: _, ...userWithoutPassword } = user;

      // This now returns the user object *and* the token
      res.json({
        user: userWithoutPassword,
        token: token
      } as AuthResponse);

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

    // 1. Generate the stateless 'state' token
    // This is a short-lived JWT that we will verify in the callback.
    const stateToken = jwt.sign(
      { purpose: 'oauth-state' }, // Simple payload
      process.env.JWT_SECRET as string,
      { expiresIn: '5m' } // Short-lived!
    );

    // 2. Call passport.authenticate, passing our manual 'state' token
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      state: stateToken
    })(req, res, next);
  });

  app.get('/api/auth/google/callback', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(501).json({ 
        message: 'Google authentication is not configured',
        details: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables'
      });
    }
    
    // 1. Manually retrieve and verify the 'state' token from the query
    const stateToken = req.query.state as string;
    if (!stateToken) {
      const errorUrl = `${FRONTEND_URL_DEF}/login?error=${encodeURIComponent('Missing state parameter')}`;
      return res.redirect(errorUrl);
    }

    try {
      jwt.verify(stateToken, process.env.JWT_SECRET as string);
      // If verification succeeds, the token is valid and not expired.
    } catch (err) {
      console.error('Invalid OAuth state token:', err);
      // --- FIX: Redirect to FRONTEND ---
      const errorUrl = `${FRONTEND_URL_DEF}/login?error=${encodeURIComponent('Invalid or expired state token')}`;
      return res.redirect(errorUrl);
    }

    // 2. If state is valid, THEN let Passport handle the 'code'
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err) {
        // --- FIX: Redirect to FRONTEND ---
        const errorUrl = `${FRONTEND_URL_DEF}/login?error=${encodeURIComponent(err.message)}`;
        return res.redirect(errorUrl);
      }
      if (!user) {
        // --- FIX: Redirect to FRONTEND ---
        const errorUrl = `${FRONTEND_URL_DEF}/login?error=Authentication failed`;
        return res.redirect(errorUrl);
      }

      // User has been authenticated, send token in URL fragment
      // This is secure as fragments are not sent to the server
     // --- THE FINAL FIX ---
      // Redirect to the FRONTEND, not the backend's root.
      // Your AuthProvider (auth-provider.tsx) is waiting for this URL.
      const token = user.token;
      const successUrl = `${FRONTEND_URL_DEF}/?token=${token}`;
      res.redirect(successUrl);
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
    // With JWT, we just need to tell the client to remove the token
    res.json({ message: 'Logged out successfully' });
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

  app.get('/api/groups/:id', useAuthorization(), async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Check if the user is a participant in the group
      if (!group.participants.includes(req.user!.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(group);
    } catch (error) {
      console.error('Error fetching group:', error);
      res.status(500).json({ message: 'Failed to fetch group' });
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
      const user = req.user as AppUser;
      if (user.role !== 'admin' && !group.participants.includes(user.id)) {
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

  app.post("/api/expenses", useAuthorization(), async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const group = await storage.getGroup(validatedData.groupId);

      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Check if the user is a participant in the group
      if (!group.participants.includes(req.user!.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(400).json({ message: 'Failed to create expense' });
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
      const user = req.user as AppUser;
      if (user.role !== 'admin' && !group.participants.includes(user.id)) {
        return res.status(403).json({ message: "You don't have access to this group's settlements" });
      }

      const settlements = await storage.getGroupSettlements(req.params.groupId);
      res.json(settlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      res.status(500).json({ message: "Failed to fetch settlements" });
    }
  });

  app.post("/api/settlements", useAuthorization(), async (req, res) => {
    try {
      const validatedData = insertSettlementSchema.parse(req.body);
      const group = await storage.getGroup(validatedData.groupId);

      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }

      // Check if the user is a participant in the group
      if (!group.participants.includes(req.user!.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const settlement = await storage.createSettlement(validatedData);
      res.status(201).json(settlement);
    } catch (error) {
      console.error('Error creating settlement:', error);
      res.status(400).json({ message: 'Failed to create settlement' });
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

    // Health check route
  app.get('/api/healthcheck', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });
}

// Check for required environment variables
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set. The application cannot start without it.');
  process.exit(1);
}

// Check for required environment variables
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is not set. The application cannot start without it.');
  process.exit(1);
}
