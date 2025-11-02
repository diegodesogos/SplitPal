import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define available roles
export const ROLES = ['admin', 'member', 'viewer'] as const;
export type Role = typeof ROLES[number];

// Define role enum for PostgreSQL
export const roleEnum = pgEnum('role', ROLES);

// Base user type without sensitive data
export interface BaseUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: Role;
  provider: string | null;
  providerId: string | null;
  lastLoginAt: Date | null;
}

// Full user type including sensitive data (internal use only)
export interface User extends BaseUser {
  hashedPassword: string | null;
}

// Public user type (safe to send to client)
export type PublicUser = Omit<BaseUser, 'provider' | 'providerId'>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  // Authentication fields
  hashedPassword: text("hashed_password"), // For password auth
  provider: text("provider"), // 'password', 'google', etc.
  providerId: text("provider_id"), // ID from the provider (for OAuth)
  role: roleEnum('role').default('member'),
  lastLoginAt: timestamp("last_login_at"),
});

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  participants: jsonb("participants").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidBy: varchar("paid_by").notNull().references(() => users.id),
  category: text("category").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  splits: jsonb("splits").notNull().$type<{ userId: string; amount: number }[]>().default([]),
});

export const settlements = pgTable("settlements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull(),
  notes: text("notes"),
  date: timestamp("date").defaultNow(),
});

// Shared user fields
const userBaseSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  name: z.string().min(1),
});

// Schema for password-based registration
export const registerUserSchema = userBaseSchema.extend({
  password: z.string().min(8),
});

// Schema for password-based login
export const loginUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// Schema for creating/updating users in database
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLoginAt: true,
  hashedPassword: true,
}).extend({
  provider: z.string().optional(),
  providerId: z.string().optional(),
  role: z.enum(ROLES).default('member'),
  hashedPassword: z.string().optional(),
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
}).extend({
  // Coerce string dates to Date objects for JSON API compatibility
  date: z.coerce.date(),
});

export const insertSettlementSchema = createInsertSchema(settlements).omit({
  id: true,
  date: true,
});

// Database types
export type DBUser = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
