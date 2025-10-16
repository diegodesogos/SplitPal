import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { type User, type InsertUser, type Group, type InsertGroup, type Expense, type InsertExpense, type Settlement, type InsertSettlement } from "@shared/schema";
import { IStorage } from '../storage';

export class SupabaseStorage implements IStorage {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) return undefined;
    return data as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(insertUser)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return data as User;
  }

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*');
    
    if (error) throw new Error(`Failed to get users: ${error.message}`);
    return data as User[];
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const { data, error } = await this.supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return undefined;
    return data as Group;
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const { data, error } = await this.supabase
      .from('groups')
      .insert(insertGroup)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create group: ${error.message}`);
    return data as Group;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined> {
    const { data, error } = await this.supabase
      .from('groups')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return undefined;
    return data as Group;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const { data, error } = await this.supabase
      .from('groups')
      .select('*')
      .or(`created_by.eq.${userId},participants.cs.{${userId}}`);
    
    if (error) throw new Error(`Failed to get user groups: ${error.message}`);
    return data as Group[];
  }

  async getAllGroups(): Promise<Group[]> {
    const { data, error } = await this.supabase
      .from('groups')
      .select('*');
    
    if (error) throw new Error(`Failed to get groups: ${error.message}`);
    return data as Group[];
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return undefined;
    return data as Expense;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const { data, error } = await this.supabase
      .from('expenses')
      .insert(insertExpense)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create expense: ${error.message}`);
    return data as Expense;
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense | undefined> {
    const { data, error } = await this.supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return undefined;
    return data as Expense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    return !error;
  }

  async getGroupExpenses(groupId: string): Promise<Expense[]> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select('*')
      .eq('group_id', groupId);
    
    if (error) throw new Error(`Failed to get group expenses: ${error.message}`);
    return data as Expense[];
  }

  async getSettlement(id: string): Promise<Settlement | undefined> {
    const { data, error } = await this.supabase
      .from('settlements')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return undefined;
    return data as Settlement;
  }

  async createSettlement(insertSettlement: InsertSettlement): Promise<Settlement> {
    const { data, error } = await this.supabase
      .from('settlements')
      .insert(insertSettlement)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create settlement: ${error.message}`);
    return data as Settlement;
  }

  async getGroupSettlements(groupId: string): Promise<Settlement[]> {
    const { data, error } = await this.supabase
      .from('settlements')
      .select('*')
      .eq('group_id', groupId);
    
    if (error) throw new Error(`Failed to get group settlements: ${error.message}`);
    return data as Settlement[];
  }
}
