# Storage System

This directory contains the storage abstraction layer for SplitPal, allowing different storage implementations based on the deployment environment.

## Architecture

The storage system uses a factory pattern to instantiate the appropriate storage implementation based on environment variables.

### Storage Types

1. **Memory Storage** (`memory`) - In-memory storage for local development
2. **Database Storage** (`database`) - PostgreSQL database using Drizzle ORM
3. **Supabase Storage** (`supabase`) - Supabase database for Vercel deployments
4. **Google Sheets Storage** (`google-sheets`) - Google Sheets for Google Cloud Functions

## Environment Variables

### Local Development
```bash
NODE_ENV=development
# No additional variables needed - defaults to memory storage
```

### Vercel Deployment
```bash
VERCEL=1
STORAGE_TYPE=supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Deployment
```bash
STORAGE_TYPE=database
DATABASE_URL=postgresql://user:password@host:port/database
```

### Google Sheets Deployment
```bash
STORAGE_TYPE=google-sheets
GOOGLE_SHEETS_ID=your_sheets_id
GOOGLE_CREDENTIALS=your_google_credentials_json
```

## Usage

The storage system is automatically configured when you import from the main storage module:

```typescript
import { storage } from '../storage';

// Use the storage instance - it will automatically use the correct implementation
const user = await storage.getUser('user-id');
const groups = await storage.getUserGroups('user-id');
```

## Manual Configuration

You can also manually create storage instances:

```typescript
import { StorageFactory } from '../storage';

// Create with explicit configuration
const storage = StorageFactory.createStorage({
  type: 'memory'
});

// Or let it auto-detect from environment
const storage = StorageFactory.getStorage();
```

## Implementation Status

- ✅ **Memory Storage** - Fully implemented with demo data
- ⚠️ **Database Storage** - Interface defined, implementation pending
- ⚠️ **Supabase Storage** - Interface defined, implementation pending  
- ⚠️ **Google Sheets Storage** - Interface defined, implementation pending

## Adding New Storage Implementations

1. Create a new class implementing `IStorage` interface
2. Add the storage type to `StorageType` union in `types.ts`
3. Add configuration options to `StorageConfig` interface
4. Update the factory switch statement in `factory.ts`
5. Add environment variable handling in `getConfigForType`

## Files

- `types.ts` - Type definitions for storage configuration
- `factory.ts` - Storage factory for creating instances
- `memory-storage.ts` - In-memory storage implementation
- `database-storage.ts` - Database storage implementation (placeholder)
- `supabase-storage.ts` - Supabase storage implementation (placeholder)
- `google-sheets-storage.ts` - Google Sheets storage implementation (placeholder)
