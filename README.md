# Expense Sharing Mobile App

## Overview

This is a mobile-first expense sharing application built with React, TypeScript, and Express.js. The app allows users to create groups, track shared expenses, calculate balances, and settle debts between group members. It features a clean, modern UI designed for mobile devices with a bottom navigation pattern similar to popular mobile apps.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Mobile-First Design**: Optimized for mobile with bottom navigation, touch-friendly interfaces, and responsive layouts

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Data Storage**: In-memory storage with interface-based design allowing easy database integration
- **API Design**: RESTful JSON API with consistent error handling and logging middleware
- **Development**: Hot reloading with Vite integration for seamless full-stack development

### Data Storage Solutions
- **Current Implementation**: In-memory storage using Map data structures for development/demo purposes
- **Database Schema**: Defined using Drizzle ORM with PostgreSQL dialect, ready for production database integration
- **Schema Design**: Four main entities - Users, Groups, Expenses, and Settlements with proper foreign key relationships
- **Validation**: Zod schemas generated from Drizzle for runtime type safety

### Authentication and Authorization
- **Current State**: Demo user system with hardcoded user ID for development
- **Session Management**: Connect-pg-simple package included for PostgreSQL session storage when authentication is implemented
- **Security**: CORS and credential handling configured for secure client-server communication

### Core Features Architecture
- **Expense Splitting**: Flexible splitting system allowing custom amounts per user with automatic validation
- **Balance Calculation**: Real-time balance computation showing who owes whom and settlement suggestions
- **Group Management**: Multi-user groups with participant management and expense categorization
- **Settlement Tracking**: Record and track debt settlements between users with multiple payment methods

### Development and Build System
- **Build Tool**: Vite for fast development server and optimized production builds
- **TypeScript**: Strict configuration with path aliases for clean imports
- **Code Organization**: Monorepo structure with shared schemas between client and server
- **Development Experience**: Hot module replacement, error overlays, and Replit-specific tooling integration

## External Dependencies

### Database and ORM
- **Drizzle ORM**: Modern TypeScript ORM with type-safe queries and schema management
- **Neon Database**: Serverless PostgreSQL database service integration
- **Connection**: @neondatabase/serverless for edge-compatible database connections

### UI and Styling
- **Radix UI**: Comprehensive set of accessible UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Modern icon library with consistent styling
- **Class Variance Authority**: Type-safe utility for creating component variants

### State Management and Data Fetching
- **TanStack Query**: Powerful data synchronization for server state with caching and background updates
- **React Hook Form**: Performant forms with minimal re-renders and validation
- **Hookform Resolvers**: Integration between React Hook Form and validation libraries

### Development Tools
- **Vite**: Next-generation frontend tooling for fast development and building
- **TypeScript**: Static type checking for enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for server-side code
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer

### Runtime and Utilities
- **Express.js**: Web application framework for Node.js with middleware ecosystem
- **Date-fns**: Modern JavaScript date utility library
- **Nanoid**: Small, secure, URL-friendly unique string ID generator
- **CLSX**: Utility for constructing className strings conditionally

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
- Start the Express server on default port 5001 (API only)
- Start Vite dev server on port 3000 (Frontend with HMR)
- Proxy API calls from frontend to backend
- **Open your browser to http://localhost:PORT** (defaults to 3001)

### Ports and local development

Default ports used by the project (can be overridden by environment variables):

- **Frontend (Vite)**: default `3001` → override with `VITE_PORT`
- **Backend (Express)**: default `5001` → override with `BACKEND_PORT` (or `SERVER_PORT`)

Vite dev server proxies `/api` to `http://localhost:${BACKEND_PORT}`.  
If your server proxies to Vite (dev-only behaviour), make sure it points to `VITE_PORT`.

Examples 
(Linux/macOS):
```bash
VITE_PORT=3002 BACKEND_PORT=5002 npm run dev


(Windows)
```powershell
$env:VITE_PORT="3002"; $env:BACKEND_PORT="5002"; npm run dev

(Windows)
```cmd
set VITE_PORT=3002
set BACKEND_PORT=5002
npm run dev

#### Permanent / repeatable approach

Add a script using cross-env (cross-platform env setter). Install it once:
```bash
npm install --save-dev cross-env

Add an npm script in package.json:

```bash
"scripts": {
  "dev": "tsx server/dev.ts",
  "dev:with-ports": "cross-env VITE_PORT=3001 BACKEND_PORT=5001 npm run dev"
}

Then run:
```bash
npm run dev:with-ports


### Development URLs
- **Frontend (Main App)**: http://localhost:3001 (if using default) 
- **Backend API**: http://localhost:5001/api (API endpoints only, using default port)
- All API calls from frontend are proxied automatically

### Important Notes
- The backend only responds to `/api/*` routes

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