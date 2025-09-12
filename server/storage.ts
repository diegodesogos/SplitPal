import { type User, type InsertUser, type Group, type InsertGroup, type Expense, type InsertExpense, type Settlement, type InsertSettlement } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Group operations
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined>;
  getUserGroups(userId: string): Promise<Group[]>;
  getAllGroups(): Promise<Group[]>;

  // Expense operations
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  getGroupExpenses(groupId: string): Promise<Expense[]>;

  // Settlement operations
  getSettlement(id: string): Promise<Settlement | undefined>;
  createSettlement(settlement: InsertSettlement): Promise<Settlement>;
  getGroupSettlements(groupId: string): Promise<Settlement[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private groups: Map<string, Group>;
  private expenses: Map<string, Expense>;
  private settlements: Map<string, Settlement>;

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.expenses = new Map();
    this.settlements = new Map();

    // Initialize with a demo user
    const demoUser: User = {
      id: "demo-user",
      username: "demo",
      email: "demo@example.com",
      name: "Demo User"
    };
    this.users.set(demoUser.id, demoUser);

    // Create some demo participants
    const participants = [
      { id: "user-1", username: "john", email: "john@example.com", name: "John Doe" },
      { id: "user-2", username: "sarah", email: "sarah@example.com", name: "Sarah Miller" },
      { id: "user-3", username: "mike", email: "mike@example.com", name: "Mike Johnson" }
    ];

    participants.forEach(user => this.users.set(user.id, user));

    // Create a demo group
    const demoGroup: Group = {
      id: "demo-group",
      name: "Weekend Trip",
      description: "Our weekend getaway expenses",
      createdBy: demoUser.id,
      participants: [demoUser.id, "user-1", "user-2", "user-3"],
      createdAt: new Date()
    };
    this.groups.set(demoGroup.id, demoGroup);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const id = randomUUID();
    const group: Group = { 
      ...insertGroup, 
      id,
      description: insertGroup.description || null,
      participants: (insertGroup.participants || []) as string[],
      createdAt: new Date()
    };
    this.groups.set(id, group);
    return group;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    
    const updatedGroup = { ...group, ...updates };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    return Array.from(this.groups.values()).filter(group => 
      group.participants.includes(userId) || group.createdBy === userId
    );
  }

  async getAllGroups(): Promise<Group[]> {
    return Array.from(this.groups.values());
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = { 
      ...insertExpense, 
      id,
      date: insertExpense.date || new Date(),
      splits: (insertExpense.splits || []) as { userId: string; amount: number }[]
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...updates };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenses.delete(id);
  }

  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    return Array.from(this.expenses.values()).filter(expense => expense.groupId === groupId);
  }

  async getSettlement(id: string): Promise<Settlement | undefined> {
    return this.settlements.get(id);
  }

  async createSettlement(insertSettlement: InsertSettlement): Promise<Settlement> {
    const id = randomUUID();
    const settlement: Settlement = { 
      ...insertSettlement, 
      id,
      notes: insertSettlement.notes || null,
      date: new Date()
    };
    this.settlements.set(id, settlement);
    return settlement;
  }

  async getGroupSettlements(groupId: string): Promise<Settlement[]> {
    return Array.from(this.settlements.values()).filter(settlement => settlement.groupId === groupId);
  }
}

export const storage = new MemStorage();
