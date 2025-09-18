# Development Setup Guide

## Architecture Overview

This is a clean, deployment-agnostic full-stack application with the following structure:

```
├── client/              # React frontend
│   ├── src/            # React source code
│   └── index.html      # HTML template
├── server/             # Express backend
│   ├── index.ts        # Main server file
│   ├── routes.ts       # API routes
│   └── storage/        # Data layer
├── shared/             # Shared types/schemas
├── dist/               # Built files (generated)
│   ├── client/         # Built React app
│   └── server/         # Built Express app
└── package.json        # Root package.json
```

## Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development mode:
   ```bash
   npm run dev
   ```

This will:
- Start the Express server on port 5000 (API only)
- Start Vite dev server on port 3000 (Frontend with HMR)
- Proxy API calls from frontend to backend
- **Open your browser to http://localhost:3000** (NOT 5000!)

### Development URLs
- **Frontend (Main App)**: http://localhost:3000 ← **Use this one!**
- **Backend API**: http://localhost:5000/api (API endpoints only)
- All API calls from frontend are proxied automatically

### Important Notes
- **Don't visit localhost:5000 directly** - it only serves API endpoints
- **Always use localhost:3000** for the frontend during development
- The backend (port 5000) only responds to `/api/*` routes

## Production Build

### Build for production:
```bash
npm run build
```

This creates:
- `dist/client/` - Static React build
- `dist/server/` - Bundled Express server

### Test production build locally:
```bash
npm run preview
```

This serves the built application on port 5000.

## Deployment

### Vercel Deployment

The app is configured to deploy to Vercel automatically:

1. **Frontend**: Built as static files using Vite
2. **Backend**: Converted to Vercel Functions automatically
3. **Routing**: API routes go to functions, everything else to React app

#### Vercel Setup:
1. Connect your GitHub repo to Vercel
2. Set build command: `npm run build`
3. Deploy - Vercel handles the rest!

#### Environment Variables:
Set in Vercel dashboard:
- `NODE_ENV=production`
- Add any database URLs, API keys, etc.

### Replit Deployment

For Replit, the app runs in development mode by default:

1. The server detects Replit environment
2. Serves with hot reloading enabled
3. Accessible via the Replit preview URL

## Key Features

### Platform Agnostic Design
- **No deployment-specific code** in the main application
- **Environment detection** handles different platforms automatically  
- **Universal Express app** works everywhere

### Development vs Production
- **Development**: Vite dev server + Express API server (separate ports)
- **Production**: Express serves static React build (single port)
- **Vercel**: Express converted to functions, static files served by CDN

### Clean Architecture
- **Removed complex Vite middleware** and logging complexity
- **Simple environment detection** using `NODE_ENV` and `VERCEL`
- **Straightforward build process** with clear separation of concerns
- **Standard Express patterns** that work everywhere

## Troubleshooting

### Local Development Issues
- Ensure ports 3000 and 5000 are available
- Check that proxy configuration in vite.config.ts is correct
- Verify API calls use relative paths (e.g., `/api/users`)

### Production Issues  
- Check build output in `dist/` folder
- Verify static files are being served correctly
- Ensure API routes start with `/api`

### Vercel Issues
- Check function logs in Vercel dashboard  
- Verify environment variables are set
- Ensure serverless function limits aren't exceeded

