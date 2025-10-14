import { type PassportStatic } from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';

export function configurePassport(passport: PassportStatic) {
  // Serialize user for the session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

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
            role: 'member' as const
          };

          user = await storage.createUser(newUser);
        } else {
          // Update existing user's last login
          user = await storage.updateUser(user.id, { lastLoginAt: new Date() });
        }

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  ));
}