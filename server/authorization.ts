import { AbilityBuilder, createMongoAbility, MongoQuery } from '@casl/ability';
import type { MongoAbility, SubjectType } from '@casl/ability';
import type { User, Group, Expense, Settlement } from '../shared/schema';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage.js';

// Define our core types
export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type Resources = 'User' | 'Group' | 'Expense' | 'Settlement' | 'all';

// Create a type alias for our specific ability type
export type AppAbility = MongoAbility;

// Define a type for our extended Express User
export interface AppUser extends User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
}

// Augment Express types
declare global {
  namespace Express {
    interface User extends AppUser {}
    interface Request {
      ability?: AppAbility;
      user?: User;
    }
  }
}

/**
 * Creates a CASL ability object for the given user
 */
export function defineAbilityForUser(user: User): AppAbility {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  // Admin has unrestricted access
  if (user.role === 'admin') {
    can('manage', 'all');
    return build();
  }

  // Base permissions for both member and viewer roles
  can(['read'], 'User'); // Can read user info
  can('read', 'User', { id: user.id }); // Can read own profile

  // Groups the user participates in
  can('read', 'Group', { 'participants': { $in: [user.id] } });

  // Expenses in groups the user participates in
  can('read', 'Expense', { 'groupId': { $in: async (id: string) => {
    const group = await storage.getGroup(id);
    return group?.participants.includes(user.id) || false;
  }}});

  // Settlements in groups the user participates in
  can('read', 'Settlement', { 'groupId': { $in: async (id: string) => {
    const group = await storage.getGroup(id);
    return group?.participants.includes(user.id) || false;
  }}});

  // Additional permissions for members
  if (user.role === 'member') {
    // Group management
    can('create', 'Group');
    can('update', 'Group', { 'participants': { $in: [user.id] } });
    
    // Expense management in groups where user is a participant
    can(['create', 'update', 'delete'], 'Expense', { 'groupId': { $in: async (id: string) => {
      const group = await storage.getGroup(id);
      return group?.participants.includes(user.id) || false;
    }}});
    
    // Settlement management in groups where user is a participant
    can('create', 'Settlement', { 'groupId': { $in: async (id: string) => {
      const group = await storage.getGroup(id);
      return group?.participants.includes(user.id) || false;
    }}});
  }

  return build();
}

/**
 * Middleware that checks if user is authenticated and attaches CASL ability to request
 */
export const useAuthorization = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized: Please log in to continue.' });
    }

    try {
      const user = req.user as User;
      if (!user) {
        throw new Error('User object missing from authenticated request');
      }

      req.ability = defineAbilityForUser(user);
      next();
    } catch (error) {
      console.error('Error setting up authorization:', error);
      res.status(500).json({ error: 'Internal server error while setting up authorization.' });
    }
  };
};

/**
 * Creates a middleware that checks if the user has the required ability
 */
export const checkAbility = (action: Actions, subject: Resources) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.ability) {
        throw new Error('Authorization middleware not properly initialized');
      }

      if (req.ability.can(action, subject)) {
        next();
      } else {
        res.status(403).json({
          error: `Forbidden: You don't have permission to ${action} this ${subject.toLowerCase()}.`
        });
      }
    } catch (error) {
      console.error('Error checking authorization:', error);
      res.status(500).json({ error: 'Internal server error while checking authorization.' });
    }
  };
};