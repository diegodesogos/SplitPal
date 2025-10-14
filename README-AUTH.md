# SplitPal Authentication and Authorization

## Overview
This document provides details about the authentication and authorization system in SplitPal, including role-based access control (RBAC) and session management.

## Roles and Permissions

### Roles
- **`admin`**: Full access to all resources.
- **`member`**: Read/write access within their groups.
- **`viewer`**: Read-only access within their groups.

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

## Session Management
- **Authentication**: Google OAuth 2.0 via Passport.js.
- **Session Storage**: Dynamic storage backend (PostgreSQL in production, memory in development).

For implementation details, refer to the code in `server/authorization.ts` and `client/src/lib/queryClient.ts`.

