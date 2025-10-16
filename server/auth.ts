import { type PassportStatic } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from './storage';
import { User, Role, PublicUser } from '@shared/schema';

// Types for authentication
declare global {
  namespace Express {
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
export interface AuthenticatedRequest extends Request {
  user?: User;  // Must match Express.User (which extends User)
  token?: string;
  auth?: AuthResponse;      // For OAuth responses
}

// Token generation with proper typing
export function generateToken(user: User): string {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');
  
  return jwt.sign(
    { id: user.id, role: user.role } as JWTPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Token verification with proper error handling and typing
export function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
    
    // Store public user data and token
    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: '', // Will be populated by subsequent middleware
      email: '',    // Will be populated by subsequent middleware
      name: '',     // Will be populated by subsequent middleware
      lastLoginAt: null,
      hashedPassword: null, // Not used for JWT-authenticated users
      provider: null,       // Not used for JWT-authenticated users
      providerId: null      // Not used for JWT-authenticated users
    };
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
    state: true, // Enable CSRF protection
    passReqToCallback: true
  },
  async (_req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
    try {
      // Try to find user by email
      const email = profile.emails[0].value;
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        const token = generateToken(existingUser);
        return done(null, { ...existingUser, token });
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
      return done(null, { ...newUser, token });
    } catch (error) {
      return done(error, null);
    }
  }));
}