# SplitPal Authentication and Authorization

## Overview
This document provides details about the authentication and authorization system in SplitPal, including role-based access control (RBAC) and session management.

## Roles and Permissions

### Roles
- **`admin`**: Full access to all resources.
- **`member`**: Read/write access within their groups.
- **`viewer`**: Read-only access within their groups.

### API Authentication and Authorization

All API endpoints except authentication endpoints require a valid JWT token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Permission Matrix
| API Endpoint                  | HTTP Method | `admin` | `member` | `viewer` | Conditions for `member`/`viewer`                  |
|-------------------------------|-------------|---------|----------|----------|---------------------------------------------------|
| `/api/users`                  | `GET`       | ✅      | ✅       | ✅       | Can only view basic info (id, name).             |
| `/api/users/:id`              | `GET`       | ✅      | ✅       | ✅       | Can only view their own profile or basic info.   |
| `/api/groups`                 | `POST`      | ✅      | ✅       | ❌       |                                                   |
| `/api/groups/:id`             | `GET`       | ✅      | ✅       | ✅       | User must be a participant in the group.         |
| `/api/groups/:id`             | `PUT`       | ✅      | ✅       | ❌       | User must be a participant in the group.         |
| `/api/users/:userId/groups`   | `GET`       | ✅      | ✅       | ✅       | `:userId` must match the authenticated user's ID.|
| `/api/groups/:groupId/expenses`| `GET`      | ✅      | ✅       | ✅       | User must be a participant in the group.         |
| `/api/expenses`               | `POST`      | ✅      | ✅       | ❌       | User must be a participant in the target group.  |
| `/api/expenses/:id`           | `GET`       | ✅      | ✅       | ✅       | User must be a participant in the expense's group.|
| `/api/expenses/:id`           | `PUT`       | ✅      | ✅       | ❌       | User must be a participant in the expense's group.|
| `/api/expenses/:id`           | `DELETE`    | ✅      | ✅       | ❌       | User must be a participant in the expense's group.|
| `/api/groups/:groupId/settlements`| `GET`   | ✅      | ✅       | ✅       | User must be a participant in the group.         |
| `/api/settlements`            | `POST`      | ✅      | ✅       | ❌       | User must be a participant in the target group.  |
| `/api/groups/:groupId/balances`| `GET`      | ✅      | ✅       | ✅       | User must be a participant in the group.         |

## Authentication System

### Token-Based Authentication
SplitPal uses JSON Web Tokens (JWT) for stateless authentication:

- **Token Generation**: Server generates JWT after successful OAuth authentication
- **Token Contents**: 
  ```typescript
  interface JWTPayload {
    id: string;      // User ID
    role: Role;      // User role (admin/member/viewer)
    iat?: number;    // Issued at timestamp
    exp?: number;    // Expiration timestamp
  }
  ```
- **Token Lifetime**: 7 days by default
- **Token Storage**: Client-side in-memory storage (not in localStorage for security)

### Authentication Flow
1. **OAuth Authentication**:
   - User clicks "Sign in with Google"
   - Google OAuth flow completes
   - Server creates/updates user record
   - Server generates JWT token
   - Token returned via URL fragment

2. **Subsequent Requests**:
   - Client includes token in Authorization header
   - Format: `Authorization: Bearer <token>`
   - Server validates token signature and expiration
   - Server attaches user data to request

3. **Error Handling**:
   - Invalid/expired tokens return 401 status
   - Missing tokens return 401 status
   - Invalid permissions return 403 status

### Security Considerations
- Tokens are never stored in localStorage/sessionStorage
- CSRF protection via token-based auth
- XSS protection via HttpOnly cookies for OAuth flow
- Automatic token expiration after 7 days
- Environment-specific JWT secrets

### Configuration
Required environment variables:
```bash
# Authentication
JWT_SECRET=your_secure_jwt_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Optional
NODE_ENV=development|production    # Affects security settings
VERCEL_URL=your.domain.com        # For Vercel deployments
```

For implementation details, refer to:
- `server/auth.ts`: JWT implementation and OAuth configuration
- `server/authorization.ts`: Role-based access control
- `client/src/context/auth-context.ts`: Frontend auth state management
- `client/src/lib/queryClient.ts`: API authentication handling

