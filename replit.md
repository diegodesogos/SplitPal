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