import { AbilityBuilder, createMongoAbility, MongoQuery } from '@casl/ability';
import type { MongoAbility, SubjectType } from '@casl/ability';
import type { User, Group, Expense, Settlement } from '../shared/schema';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage.js';

import jwt from 'jsonwebtoken';
import { JWTPayload } from './auth.js';

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

  // Simplified permissions for groups, expenses, and settlements
  can('read', 'Group');
  can('read', 'Expense');
  can('read', 'Settlement');

  // Additional permissions for members
  if (user.role === 'member') {
    // Group management
    can('create', 'Group');
    can('update', 'Group', { 'participants': { $in: [user.id] } });

    // Expense management
    can(['create', 'update', 'delete'], 'Expense');

    // Settlement management
    can('create', 'Settlement');
  }

  return build();
}

/**
 * Middleware that checks if user is authenticated and attaches CASL ability to request
 */
export const useAuthorization = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided. Please include a Bearer token in the Authorization header.' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      
      if (!decoded.id || !decoded.role) {
        return res.status(401).json({ error: 'Invalid token format' });
      }

      // Get full user details from storage
      const user = await storage.getUser(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Verify user role matches token
      if (user.role !== decoded.role) {
        return res.status(401).json({ error: 'Token role mismatch' });
      }

      req.user = user;
      req.ability = defineAbilityForUser(user);
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
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