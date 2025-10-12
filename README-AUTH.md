# SplitPal Authentication and Authorization Plan

## Introduction

This document outlines the plan for implementing a robust authentication and authorization system in the SplitPal application. The goal is to secure the frontend and API, allow users to log in with external providers (specifically Google), and introduce a flexible role-based access control (RBAC) system.

This plan has been specifically designed to accommodate the project's multi-storage architecture and is Vercel-ready.

## Core Technologies

* **Authentication:** **Passport.js** will be used as the authentication middleware for Node.js. It's modular and provides a wide range of strategies. For this implementation, we will use `passport-google-oauth20` for Google-based logins.
* **Authorization:** **CASL (Can I Use This?)** will be used for authorization. It's a powerful and flexible library that allows for defining permissions based on roles and attributes, and it can be used on both the server and the client.
* **Session Management:** **`express-session`** will be used to manage user sessions. The session store will be dynamically provided by our `StorageFactory` to ensure persistence in serverless environments like Vercel.

## Compatibility and Future-Proofing

* **Passport.js & CASL:** Both libraries operate on the authenticated user object (`req.user`). They are decoupled from the session storage mechanism. As long as `express-session` can successfully restore a session, Passport and CASL will function correctly, regardless of whether the session is stored in memory or a database.
* **Vercel:** Vercel's serverless functions are **stateless**. This means an in-memory session store is **unsuitable for production** as session data would be lost between requests. The refined plan mandates a persistent, database-backed session store for all production and Vercel deployments, ensuring a stable user login experience.
* **Auth0:** This architecture is fully compatible with future integrations like Auth0. If used in a standard web-app flow, Auth0 would simply become another Passport.js strategy, relying on the same robust session management system. If you were to pivot to a token-based (JWT) SPA architecture, this session management code would not conflict and could be phased out or used alongside it.

## Authorization Requirements

This section details the specific permissions for each role and how they apply to the existing API endpoints defined in `server/routes.ts`. The primary condition for `member` and `viewer` roles is that they must be a participant in the group they are trying to access.

### Roles

* **`admin`**: Has unrestricted access to all resources. Can perform any action (create, read, update, delete) on any data.
* **`member`**: A standard user who is a participant in one or more groups. They have full read/write access within the groups they belong to.
* **`viewer`**: A user with read-only access to groups they are a part of. They cannot create, update, or delete any data.

### Permission Matrix by API Route

| API Endpoint | HTTP Method | `admin` | `member` | `viewer` | Conditions for `member`/`viewer` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/users` | `GET` | ✅ | ✅ | ✅ | Can only view basic info (id, name). |
| `/api/users/:id` | `GET` | ✅ | ✅ | ✅ | Can only view their own profile or basic info of others. |
| `/api/groups` | `POST` | ✅ | ✅ | ❌ | |
| `/api/groups/:id` | `GET` | ✅ | ✅ | ✅ | User must be a participant in the group. |
| `/api/groups/:id` | `PUT` | ✅ | ✅ | ❌ | User must be a participant in the group. |
| `/api/users/:userId/groups`| `GET` | ✅ | ✅ | ✅ | `:userId` must match the authenticated user's ID. |
| `/api/groups/:groupId/expenses` | `GET` | ✅ | ✅ | ✅ | User must be a participant in the group. |
| `/api/expenses` | `POST` | ✅ | ✅ | ❌ | User must be a participant in the target group. |
| `/api/expenses/:id` | `GET` | ✅ | ✅ | ✅ | User must be a participant in the expense's group. |
| `/api/expenses/:id` | `PUT` | ✅ | ✅ | ❌ | User must be a participant in the expense's group. |
| `/api/expenses/:id` | `DELETE` | ✅ | ✅ | ❌ | User must be a participant in the expense's group. |
| `/api/groups/:groupId/settlements`| `GET` | ✅ | ✅ | ✅ | User must be a participant in the group. |
| `/api/settlements` | `POST` | ✅ | ✅ | ❌ | User must be a participant in the target group. |
| `/api/groups/:groupId/balances`| `GET` | ✅ | ✅ | ✅ | User must be a participant in the group. |

## Implementation Plan

The implementation is broken down into the following tasks.

IMPORTANT NOTE FOR AI AGENTS/Humans: All the following tasks are TBD. This document needs to be updated and code implementation details removed once they are applied to the codebase and the task is marked as completed. Having completed all tasks, this implementation plan section will contain general guidance for future changes/refactorings.

### Task 1: Backend - Core Setup and Database Changes

1.  **Install Dependencies:**
    * Add the necessary packages for authentication and session management:
        ```bash
        npm install passport passport-google-oauth20 express-session cookie-parser connect-pg-simple
        npm install -D @types/passport-google-oauth20 @types/express-session @types/cookie-parser
        ```
    * Install the authorization library:
        ```bash
        npm install @casl/ability
        ```

2.  **Update Database Schema:**
    * Modify the `users` table in `shared/schema.ts` to include fields for authentication and roles.
        ```typescript
        // shared/schema.ts
        import { pgTable, text, varchar, pgEnum, sql } from "drizzle-orm/pg-core";

        export const roleEnum = pgEnum('role', ['admin', 'member', 'viewer']);

        export const users = pgTable("users", {
          id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
          username: text("username").notNull().unique(),
          email: text("email").notNull().unique(),
          name: text("name").notNull(),
          provider: text("provider"), // e.g., 'google'
          providerId: text("provider_id"), // The user's ID from the provider
          role: roleEnum('role').default('member'),
        });
        ```
    * Run `npm run db:push` to apply the changes to your database schema.

3.  **Refactor `StorageFactory` to Provide Session Store:**
    * Centralize session store selection within `server/storage/factory.ts` to avoid logic duplication. This new method will automatically provide a persistent store for production/Vercel and a memory store for local development.

        ```typescript
        // server/storage/factory.ts
        import session from 'express-session';
        import ConnectPgSimple from 'connect-pg-simple';
        import pg from 'pg';
        import memorystore from 'memorystore';
        // ... other imports

        const MemoryStore = memorystore(session);

        export class StorageFactory {
          // ... existing methods: instance, getStorage, createStorage, etc.

          static getSessionStore(): session.Store {
            const config = this.getConfigFromEnvironment();
            const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

            // For production environments (including Vercel), use a persistent store if available
            if (isProduction && (config.type === 'database' || config.type === 'supabase')) {
              if (config.databaseUrl) {
                console.info('Using PostgreSQL for session storage.');
                const pgPool = new pg.Pool({ connectionString: config.databaseUrl });
                const PgSession = ConnectPgSimple(session);
                return new PgSession({ pool: pgPool });
              } else {
                // This is a critical failure condition for production.
                throw new Error('DATABASE_URL is required for session storage in production but is not defined.');
              }
            }
            
            // For local development or non-DB production environments (like google-sheets), use memory store.
            console.info('Using in-memory session storage.');
            if (isProduction) {
                console.warn('WARNING: Using a non-persistent in-memory session store in a production/serverless environment. Sessions will NOT be persistent.');
            }
            return new MemoryStore({ checkPeriod: 86400000 }); // 24 hours
          }

          // ... getConfigFromEnvironment and reset methods
        }
        ```

4.  **Simplify Session Configuration in `server/index.ts`:**
    * Update `server/index.ts` to be clean and simple, delegating the store selection to the factory.
        ```typescript
        // server/index.ts
        import express from 'express';
        import session from 'express-session';
        import cookieParser from 'cookie-parser';
        import { StorageFactory } from './storage/factory.js';
        // ... other imports

        const app = express();
        // ... middleware

        app.use(cookieParser());
        app.use(session({
          store: StorageFactory.getSessionStore(),
          secret: process.env.SESSION_SECRET || 'a-very-secret-key', // MUST be in environment variables
          resave: false,
          saveUninitialized: false,
          cookie: { 
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
          }
        }));

        // ... rest of the file
        ```

### Task 2: Backend - Authentication

1.  **Configure Passport:**
    * Create a new file `server/auth.ts` to handle Passport configuration.
    * Implement the Google OAuth 2.0 strategy. This will involve:
        * Setting up the `GoogleStrategy` with credentials from environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
        * In the strategy's callback, find a user with `storage.getUserByEmail` or create a new one with `storage.createUser`.

2.  **Initialize Passport:**
    * In `server/index.ts`, initialize Passport and configure it to use sessions:
        ```typescript
        // server/index.ts
        import passport from 'passport';
        import { configurePassport } from './auth';

        // ... after session middleware
        app.use(passport.initialize());
        app.use(passport.session());

        configurePassport(passport);
        ```

3.  **Create Authentication Routes:**
    * In `server/routes.ts`, add the following routes:
        * `GET /api/auth/google`: Redirects the user to Google for authentication.
        * `GET /api/auth/google/callback`: Handles the callback from Google, authenticates the user, and redirects them to the frontend.
        * `POST /api/auth/logout`: Logs the user out and destroys the session.
        * `GET /api/auth/me`: A protected route to get the currently authenticated user's information.

### Task 3: Backend - Authorization

1.  **Define Abilities:**
    * Create `server/authorization.ts` to define CASL abilities for each role.
    * The builder will define permissions like: `can('manage', 'all')` for `admin`, or `can('read', 'Group', { participants: { $in: [user.id] } })` for `member` and `viewer`.

2.  **Create Authorization Middleware:**
    * Create an Express middleware that checks `req.isAuthenticated()` and attaches a CASL `ability` object to the `req` based on the `req.user.role`.

3.  **Protect API Routes:**
    * Apply the authentication and authorization middleware to existing routes in `server/routes.ts`. For example, check `req.ability.can('create', 'Expense')` before creating an expense.

### Task 4: Frontend - Authentication Flow

1.  **Update App Context:**
    * Modify `client/src/context/app-context.ts` and `client/src/App.tsx` to manage the authenticated user's state, including the user object, a loading state, and an `isAuthenticated` flag.

2.  **Create Login Page and UI:**
    * Create a new login page with a "Login with Google" button (`<a>` tag) linking to `/api/auth/google`.
    * Update `client/src/pages/profile.tsx` to display user info and a "Logout" button.

3.  **Implement Protected Routes:**
    * Create a `ProtectedRoute` component that redirects unauthenticated users to the login page.
    * Wrap the application's routes in `client/src/App.tsx` with this component.

### Task 5: Frontend - Authorization UI

1.  **Store User Role:**
    * The `/api/auth/me` endpoint should return the user's role. Store this role in the `AppContext`.

2.  **Conditionally Render UI:**
    * Use the user's role from the context to conditionally render UI elements.
        * For example, in `client/src/pages/expenses.tsx`, hide "Edit" and "Delete" buttons if the user's role is `viewer`.
        * In `client/src/components/bottom-navigation.tsx`, hide the "Add Expense" button for `viewer` roles.

3.  **Update API Client:**
    * Modify `client/src/lib/queryClient.ts` to handle 401 Unauthorized responses by clearing the user's authentication state and redirecting to the login page.

