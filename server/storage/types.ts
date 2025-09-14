export type StorageType = 'memory' | 'database' | 'supabase' | 'google-sheets';

export interface StorageConfig {
  type: StorageType;
  databaseUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  googleSheetsId?: string;
  googleCredentials?: string;
}

export interface StorageEnvironment {
  NODE_ENV: string;
  VERCEL: string | undefined;
  STORAGE_TYPE?: StorageType;
  DATABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  GOOGLE_SHEETS_ID?: string;
  GOOGLE_CREDENTIALS?: string;
}
