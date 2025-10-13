export type StorageType = 'memory' | 'database' | 'supabase' | 'google-sheets';

export interface StorageConfig {
  type: StorageType;
  databaseUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  googleSheetsId?: string;
  googleCredentials?: string;
  googleServiceAccountEmail?: string;
  googlePrivateKey?: string;
  sessionSecret?: string;
  sessionTable?: string;
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
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  SESSION_SECRET?: string;
  SESSION_TABLE?: string;
}
