import { IStorage } from "../storage";
import { MemStorage } from "./memory-storage";
import { DatabaseStorage } from "./database-storage";
import { SupabaseStorage } from "./supabase-storage";
import { GoogleSheetsStorage } from "./google-sheets-storage";
import { StorageConfig, StorageEnvironment, StorageType } from "./types";
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import MemoryStore from 'memorystore';

const MemoryStoreFactory = MemoryStore(session);

export class StorageFactory {
  private static instance: IStorage | null = null;
  private static sessionStore: session.Store | null = null;

  static getStorage(): IStorage {
    if (!this.instance) {
      this.instance = this.createStorage();
    }
    return this.instance;
  }

  static createStorage(config?: StorageConfig): IStorage {
    const storageConfig = config || this.getConfigFromEnvironment();
    console.info(`Using ${storageConfig.type} storage`);
    switch (storageConfig.type) {
      case "memory":
        return new MemStorage();

      case "database":
        return new DatabaseStorage(storageConfig.databaseUrl!);

      case "supabase":
        return new SupabaseStorage(
          storageConfig.supabaseUrl!,
          storageConfig.supabaseKey!,
        );

      case "google-sheets":
        return new GoogleSheetsStorage({
          rootSheetsId: storageConfig.googleSheetsId!,
          credentials: storageConfig.googleCredentials!,
          serviceAccountEmail: storageConfig.googleServiceAccountEmail,
          privateKey: storageConfig.googlePrivateKey,
        });

      default:
        throw new Error(`Unsupported storage type: ${storageConfig.type}`);
    }
  }

  static getConfigFromEnvironment(): StorageConfig {
    const env = process.env as unknown as StorageEnvironment;

    // Check for explicit storage type override
    if (env.STORAGE_TYPE) {
      return this.getConfigForType(env.STORAGE_TYPE as StorageType, env);
    }

    // Auto-detect based on environment
    if (env.VERCEL) {
      // Running on Vercel - prefer database or Supabase
      if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
        return {
          type: "supabase",
          supabaseUrl: env.SUPABASE_URL,
          supabaseKey: env.SUPABASE_ANON_KEY,
        };
      }

      if (env.DATABASE_URL) {
        return {
          type: "database",
          databaseUrl: env.DATABASE_URL,
        };
      }

      // Fallback to memory for Vercel if no database configured
      console.warn(
        "No database configured for Vercel deployment, falling back to memory storage",
      );
      return { type: "memory" };
    }

    // Local development - use memory storage by default
    if (env.NODE_ENV === "development") {
      return { type: "memory" };
    }

    // Production fallback - try database first, then memory
    if (env.DATABASE_URL) {
      return {
        type: "database",
        databaseUrl: env.DATABASE_URL,
      };
    }

    console.warn(
      "No database configured for production, falling back to memory storage",
    );
    return { type: "memory" };
  }

  private static getConfigForType(
    type: StorageType,
    env: StorageEnvironment,
  ): StorageConfig {
    switch (type) {
      case "memory":
        return { type: "memory" };

      case "database":
        if (!env.DATABASE_URL) {
          throw new Error(
            "DATABASE_URL environment variable is required for database storage",
          );
        }
        return {
          type: "database",
          databaseUrl: env.DATABASE_URL,
        };

      case "supabase":
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
          throw new Error(
            "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required for Supabase storage",
          );
        }
        return {
          type: "supabase",
          supabaseUrl: env.SUPABASE_URL,
          supabaseKey: env.SUPABASE_ANON_KEY,
        };

      case "google-sheets":
        if (!env.GOOGLE_SHEETS_ID) {
          throw new Error(
            "GOOGLE_SHEETS_ID environment variable is required for Google Sheets storage",
          );
        }

        // Support both service account and JSON credentials authentication
        if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
          return {
            type: "google-sheets",
            googleSheetsId: env.GOOGLE_SHEETS_ID,
            googleServiceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            googlePrivateKey: env.GOOGLE_PRIVATE_KEY,
          };
        } else if (env.GOOGLE_CREDENTIALS) {
          return {
            type: "google-sheets",
            googleSheetsId: env.GOOGLE_SHEETS_ID,
            googleCredentials: env.GOOGLE_CREDENTIALS,
          };
        } else {
          throw new Error(
            "Either GOOGLE_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables are required for Google Sheets storage",
          );
        }

      default:
        throw new Error(`Unsupported storage type: ${type}`);
    }
  }

  static getSessionStore(): session.Store {
    if (!this.sessionStore) {
      const config = this.getConfigFromEnvironment();
      this.sessionStore = this.createSessionStore(config);
    }
    return this.sessionStore;
  }

  private static createSessionStore(config: StorageConfig): session.Store {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

    // For database-backed storage types in production, use persistent session store
    if (isProduction && (config.type === 'database' || config.type === 'supabase')) {
      const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;
      
      if (databaseUrl) {
        console.info('Using PostgreSQL for session storage');
        const pgPool = new Pool({ connectionString: databaseUrl });
        const PgSession = ConnectPgSimple(session);
        return new PgSession({ 
          pool: pgPool,
          tableName: config.sessionTable || 'user_sessions'
        });
      }
    }
    
    // For development or non-database storage types, use memory store
    console.info('Using in-memory session storage');
    if (isProduction) {
      console.warn('WARNING: Using non-persistent session store in production environment');
    }
    
    return new MemoryStoreFactory({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  static reset(): void {
    this.instance = null;
    this.sessionStore = null;
  }
}
