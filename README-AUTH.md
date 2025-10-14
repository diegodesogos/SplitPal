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

IMPORTANT NOTE FOR AI AGENTS/Humans: As tasks are completed, their implementation details are removed from this document and moved to their respective code files. This section will be updated to contain general guidance for future changes/refactorings.

### Completed Tasks:

#### Task 1: Backend - Core Setup ✅
- Added authentication and session management packages
- Updated database schema with user roles and auth fields
- Implemented session store factory pattern
- Configured secure session handling

#### Task 2: Backend - Authentication ✅
- Implemented Passport.js with Google OAuth 2.0
- Added proper error handling for missing credentials
- Created authentication routes
- Integrated with storage system for user management

### Pending Tasks:

### Task 3: Backend - Authorization Implementation

1. **Set up @casl/ability for backend authorization**
   * Create `server/authorization.ts` to define CASL abilities for each role
   * Implement the ability builder to define role-based permissions:
     * `admin`: `can('manage', 'all')`
     * `member`: `can('read', 'Group', { participants: { $in: [user.id] } })`
     * `viewer`: Limited read-only permissions on accessible resources

2. **Create authorization middleware**
   * Create an Express middleware that:
     * Checks `req.isAuthenticated()`
     * Creates and attaches a CASL `ability` object to `req` based on user role
     * Handles unauthorized access with proper error responses

3. **Apply authorization to API routes**
   * Update routes in `server/routes.ts` to use the new auth middleware
   * Add ability checks before operations (e.g., `req.ability.can('create', 'Expense')`)
   * Ensure proper error handling for unauthorized actions

### Task 4: Frontend Authentication Implementation

1. **Update AppContext for authentication**
   * Modify `client/src/context/app-context.ts` and `App.tsx` to:
     * Manage authenticated user state
     * Track loading and authentication status
     * Provide auth-related context to child components

2. **Create login page and UI components**
   * Create new login page with Google OAuth integration
   * Update `client/src/pages/profile.tsx` with user info display
   * Implement logout functionality with proper state cleanup

3. **Implement protected routes**
   * Create `ProtectedRoute` component for auth state management
   * Configure route protection in `client/src/App.tsx`
   * Handle unauthenticated redirects to login page

### Task 5: Frontend Authorization Implementation

1. **Add role-based UI conditionals**
   * Update UI components based on user role from AppContext
   * Implement conditional rendering for role-specific features
   * Ensure consistent UX across all protected features

2. **Update API client for auth handling**
   * Modify `client/src/lib/queryClient.ts` to:
     * Handle 401 Unauthorized responses
     * Clear auth state on session expiration
     * Redirect to login when needed
     * Provide consistent error handling

