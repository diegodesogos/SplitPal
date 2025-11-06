import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from './index'; // Assuming your Express app is exported from index.ts
import { Request, Response, NextFunction } from 'express';
// 1. Import the type we need to cast to
import type { AppAbility } from './authorization.js';

// Mock the entire authorization module
vi.mock('./authorization.js', () => ({
  useAuthorization: vi.fn(() => {
    return (req: Request, res: Response, next: NextFunction) => {
      req.user = {
        id: 'demo-user',
        username: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'member',
        provider: 'google',
        providerId: 'google-demo-id',
        lastLoginAt: new Date(),
        hashedPassword: null,
      };
      
      // 2. Cast the simple mock object to the complex type
      req.ability = {
        can: () => true,
        cannot: () => false,
      } as unknown as AppAbility; // <-- THIS IS THE FIX

      next();
    };
  }),
  checkAbility: vi.fn(() => {
    return (req: Request, res: Response, next: NextFunction) => {
      // This mock just lets all 'checkAbility' calls pass
      next();
    };
  }),
}));

describe('API Routes', () => {
  beforeEach(() => {
    // Clear mocks before each test to ensure isolation
    vi.clearAllMocks();
  });

  it('GET /api/healthcheck should return 200 OK', async () => {
    const response = await request(app).get('/api/healthcheck');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /api/groups should return groups for an authenticated user', async () => {
    // We don't need to set any headers; the mock handles authentication.
    const response = await request(app).get('/api/groups');

    expect(response.status).toBe(200);
    // Based on MemStorage, it should return the demo groups
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
  
  it('GET /api/users should return all users for an authenticated user', async () => {
    const response = await request(app).get('/api/users');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    // MemStorage initializes with 4 users
    expect(response.body.length).toBe(4); 
    // Ensure sensitive data is filtered as per routes.ts
    expect(response.body[0]).not.toHaveProperty('hashedPassword');
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('name');
  });
});
