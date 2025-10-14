import { type User, type InsertUser, type Group, type InsertGroup, type Expense, type InsertExpense, type Settlement, type InsertSettlement } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
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

// Re-export storage implementations
export { MemStorage } from './storage/memory-storage';
export { DatabaseStorage } from './storage/database-storage';
export { SupabaseStorage } from './storage/supabase-storage';
export { GoogleSheetsStorage } from './storage/google-sheets-storage';

// Re-export factory
export { StorageFactory } from './storage/factory';

// Create and export the default storage instance using the factory
import { StorageFactory } from './storage/factory';
export const storage = StorageFactory.getStorage();
