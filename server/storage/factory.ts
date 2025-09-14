import { IStorage } from '../storage';
import { MemStorage } from './memory-storage';
import { DatabaseStorage } from './database-storage';
import { SupabaseStorage } from './supabase-storage';
import { GoogleSheetsStorage } from './google-sheets-storage';
import { StorageConfig, StorageEnvironment, StorageType } from './types';

export class StorageFactory {
  private static instance: IStorage | null = null;

  static getStorage(): IStorage {
    if (!this.instance) {
      this.instance = this.createStorage();
    }
    return this.instance;
  }

  static createStorage(config?: StorageConfig): IStorage {
    const storageConfig = config || this.getConfigFromEnvironment();
    
    switch (storageConfig.type) {
      case 'memory':
        return new MemStorage();
      
      case 'database':
        return new DatabaseStorage(storageConfig.databaseUrl!);
      
      case 'supabase':
        return new SupabaseStorage(
          storageConfig.supabaseUrl!,
          storageConfig.supabaseKey!
        );
      
      case 'google-sheets':
        return new GoogleSheetsStorage(
          storageConfig.googleSheetsId!,
          storageConfig.googleCredentials!
        );
      
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
          type: 'supabase',
          supabaseUrl: env.SUPABASE_URL,
          supabaseKey: env.SUPABASE_ANON_KEY
        };
      }
      
      if (env.DATABASE_URL) {
        return {
          type: 'database',
          databaseUrl: env.DATABASE_URL
        };
      }
      
      // Fallback to memory for Vercel if no database configured
      console.warn('No database configured for Vercel deployment, falling back to memory storage');
      return { type: 'memory' };
    }
    
    // Local development - use memory storage by default
    if (env.NODE_ENV === 'development') {
      return { type: 'memory' };
    }
    
    // Production fallback - try database first, then memory
    if (env.DATABASE_URL) {
      return {
        type: 'database',
        databaseUrl: env.DATABASE_URL
      };
    }
    
    console.warn('No database configured for production, falling back to memory storage');
    return { type: 'memory' };
  }

  private static getConfigForType(type: StorageType, env: StorageEnvironment): StorageConfig {
    switch (type) {
      case 'memory':
        return { type: 'memory' };
      
      case 'database':
        if (!env.DATABASE_URL) {
          throw new Error('DATABASE_URL environment variable is required for database storage');
        }
        return {
          type: 'database',
          databaseUrl: env.DATABASE_URL
        };
      
      case 'supabase':
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
          throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required for Supabase storage');
        }
        return {
          type: 'supabase',
          supabaseUrl: env.SUPABASE_URL,
          supabaseKey: env.SUPABASE_ANON_KEY
        };
      
      case 'google-sheets':
        if (!env.GOOGLE_SHEETS_ID || !env.GOOGLE_CREDENTIALS) {
          throw new Error('GOOGLE_SHEETS_ID and GOOGLE_CREDENTIALS environment variables are required for Google Sheets storage');
        }
        return {
          type: 'google-sheets',
          googleSheetsId: env.GOOGLE_SHEETS_ID,
          googleCredentials: env.GOOGLE_CREDENTIALS
        };
      
      default:
        throw new Error(`Unsupported storage type: ${type}`);
    }
  }

  static reset(): void {
    this.instance = null;
  }
}
