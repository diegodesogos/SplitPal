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
  user?: PublicUser | User;  // Can be either full user or public user data
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
      lastLoginAt: null
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

  // Configure Google Strategy
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.VERCEL 
        ? `https://${process.env.VERCEL_URL}/api/auth/google/callback`
        : `http://localhost:${process.env.BACKEND_PORT || 5001}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');

        if (!user) {
          // Create new user
          const newUser = {
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName,
            username: profile.emails?.[0]?.value?.split('@')[0] || '',
            provider: 'google',
            providerId: profile.id,
            role: 'member' as Role,
            hashedPassword: undefined, // Not used for OAuth
            lastLoginAt: new Date()
          };

          user = await storage.createUser(newUser);
        } else {
          // Update existing user's last login
          user = await storage.updateUser(user.id, { lastLoginAt: new Date() });
        }

        if (!user) {
          return done(new Error('Failed to create/update user'));
        }

        // Generate JWT token
        const token = generateToken(user);

        // Create the authenticated user object
        const publicUser: Express.User = {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
          token // Include the token for the session
        };

        done(null, publicUser);
      } catch (error) {
        done(error as Error);
      }
    }
  ));
}