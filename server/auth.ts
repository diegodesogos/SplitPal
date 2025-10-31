import { type PassportStatic } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from './storage';
import { User as SchemaUser, Role, PublicUser } from '@shared/schema';
import { User } from '@shared/schema';

// Types for authentication
declare global {
  namespace Express {
    // This tells Express that 'req.user' IS the PublicUser
    interface User extends PublicUser {
      token?: string;
    }
 }
}

// Custom type for auth response
export interface AuthResponse {
  user: PublicUser;
  token: string;
}

// Ensure JWT_SECRET is set
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for authentication');
}

// JWT payload structure
export interface JWTPayload {
  id: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// Request with auth data
export type AuthenticatedRequest = Request & {
  token?: string;
  auth?: AuthResponse;
};

// Token generation with proper typing
export function generateToken(user: SchemaUser): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  
  return jwt.sign(
    { id: user.id, role: user.role } as JWTPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Token verification with proper error handling and typing
export async function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (!decoded.id || !decoded.role) {
      throw new Error('Invalid token payload');
    }
    
    // Fetch the full user from storage using the ID from the token
    const user = await storage.getUser(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

   const publicUser: PublicUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      lastLoginAt: user.lastLoginAt
    };

    // Update req.user to include all properties required by the User type
    req.user = {
      ...publicUser,
      hashedPassword: user.hashedPassword,
      provider: user.provider,
      providerId: user.providerId
    } as User;
    
    req.token = token;
    
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function configurePassport(passport: PassportStatic) {
  // Configure Google Strategy only if credentials are available
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not found. Google authentication will not be available.');
    console.warn('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables to enable Google login.');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/callback`,
    scope: ['email', 'profile'],
    state: false, // manage state for CSRF manually
    passReqToCallback: true
  },
  async (_req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
    try {
      // Try to find user by email
      const email = profile.emails[0].value;
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        const token = generateToken(existingUser);
        const publicUser: PublicUser = {
            id: existingUser.id,
            username: existingUser.username,
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role,
            lastLoginAt: existingUser.lastLoginAt
          };
        // Include additional properties to match the User type
        const userWithAdditionalProps = {
          ...publicUser,
          hashedPassword: existingUser.hashedPassword,
          provider: existingUser.provider,
          providerId: existingUser.providerId
        };

        return done(null, { ...userWithAdditionalProps, token });
      }

      // Create new user if not found
      const username = email.split('@')[0]; // Generate username from email
      const newUser = await storage.createUser({
        username,
        email,
        name: profile.displayName,
        role: 'member', // Default role for new users
        provider: 'google',
        providerId: profile.id
      });

      const token = generateToken(newUser);
      const publicUser: PublicUser = {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          lastLoginAt: newUser.lastLoginAt
        };
      return done(null, { ...publicUser, token });
    } catch (error) {
      return done(error, null);
    }
  }));
}