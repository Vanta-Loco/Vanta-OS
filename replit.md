# Vanta Cold Blog

## Overview

Vanta Cold is a hybrid entertainment portal and music label platform. It combines editorial/blog functionality (called Transmissions) with a Releases discography, a Worlds/projects universe page, and an early Vanta OS gateway. Built with React and Express, it features a dark, immersive aesthetic inspired by music/lifestyle brands. Posts are referred to as "Transmissions" throughout the UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System**
- Shadcn UI component library (New York style variant) with Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Typography: Space Grotesk for headlines, Inter for body text
- Theme system supporting dark/light modes with CSS variables

**State Management Strategy**
- Server state: TanStack Query with infinite stale time for cached data
- UI state: React hooks (useState, useContext) for local component state
- Theme state: Context API with localStorage persistence
- Form state: React Hook Form with Zod validation

**Design System**
- Photography-first layout with grid systems
- Editorial magazine-style layouts
- Custom spacing primitives (2, 4, 6, 8, 12, 16, 24px scale)
- Container widths: max-w-7xl (1280px) for layouts, max-w-3xl (768px) for reading
- Color system using HSL with CSS custom properties for theme switching

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- RESTful API design pattern
- Middleware-based request processing pipeline

**Data Layer**
- Currently: In-memory storage using Map data structure (MemStorage class)
- Schema: Drizzle ORM with PostgreSQL dialect configured but not yet connected
- Data models: Posts with fields for title, excerpt, content, images, category, metadata

**API Design**
- GET /api/posts - Retrieve all posts (Transmissions) sorted by creation date
- GET /api/posts/:id - Retrieve single post by ID
- POST /api/posts - Create new post with validation
- PATCH /api/posts/:id - Update post
- DELETE /api/posts/:id - Delete post
- GET /api/releases - Retrieve all releases sorted by creation date
- GET /api/releases/:id - Retrieve single release by ID
- POST /api/releases - Create new release
- PATCH /api/releases/:id - Update release
- DELETE /api/releases/:id - Delete release
- POST /api/upload - Upload image or audio file; returns { url: "/uploads/filename.ext" }
- JSON request/response format
- Zod schema validation for request payloads

**Development Setup**
- Vite middleware mode integrated with Express for HMR in development
- Separate build processes for client (Vite) and server (esbuild)
- Custom logging middleware for request/response tracking

### Data Storage Solutions

**Current Implementation**
- MemStorage class providing in-memory data persistence
- IStorage interface defining data access contract
- Posts stored in Map<string, Post> with UUID keys

**Future Database Integration**
- Drizzle ORM configured for PostgreSQL
- Neon serverless PostgreSQL client ready for integration
- Migration system set up with drizzle-kit
- Schema defined with pgTable for posts table

**Data Schema**
- Posts table with columns: id (UUID), title, excerpt, content, coverImage, images (array), category, readTime, createdAt, featured
- Validation using drizzle-zod for type-safe inserts
- Default values for arrays and timestamps

### Site Content (Editable Pages)

**About Page**
- Schema: `siteContent` pgTable in `shared/schema.ts` with `key` (varchar PK) + 11 text content fields + `updatedAt`
- Fields: `title`, `heroP1`, `heroP2`, `heroP3`, `journeyTitle`, `creativeTitle`, `creativeBody`, `visionTitle`, `visionBody`, `missionTitle`, `missionBody`
- `ABOUT_DEFAULTS` exported from schema — hardcoded fallback when no DB row exists
- `updateSiteContentSchema` (Zod) validates partial PATCH payloads
- Storage: `getAboutContent()` returns DB row or `ABOUT_DEFAULTS`; `upsertAboutContent()` merges current (or defaults) with patch data before upserting — prevents partial saves from zeroing untouched fields
- API: `GET /api/site-content/about` (public), `PATCH /api/site-content/about` (admin-only)
- Admin UI: `AboutEditor` component in `/admin` — grouped form with Input/Textarea per field, saves via PATCH
- Public page (`/about`): `useQuery(['/api/site-content/about'])`, falls back to `ABOUT_DEFAULTS` while loading; layout/images unchanged

### Authentication and Authorization

**Current State**
- Session-based admin authentication implemented
- Single admin account protected by ADMIN_PASSWORD environment variable
- Sessions stored in PostgreSQL via connect-pg-simple (table: user_sessions)
- Session secret from SESSION_SECRET environment variable

**Protected Routes (require admin session)**
- POST /api/posts
- PATCH /api/posts/:id
- DELETE /api/posts/:id
- POST /api/releases
- PATCH /api/releases/:id
- DELETE /api/releases/:id
- POST /api/upload

**Admin Routes**
- GET /api/admin/me — check session status
- POST /api/admin/login — login with password
- POST /api/admin/logout — destroy session

**Admin UI**
- /admin/login — login page
- /admin — dashboard (redirects to login if not authenticated)
- /enter — Vanta OS gateway (has subtle "Admin access" link at bottom)

### External Dependencies

**UI Component Libraries**
- Radix UI primitives for accessible component foundations
- Shadcn UI for pre-built component patterns
- Lucide React for iconography
- React Icons for social media icons

**Form Management**
- React Hook Form for form state and validation
- @hookform/resolvers for Zod schema integration
- Zod for runtime type validation

**Data Fetching**
- TanStack Query for server state management
- Custom query client configuration with disabled refetching

**Database & ORM**
- Drizzle ORM for type-safe database queries
- @neondatabase/serverless for PostgreSQL connectivity
- drizzle-zod for schema-to-validation conversion

**Styling**
- Tailwind CSS with PostCSS
- class-variance-authority for variant-based styling
- clsx and tailwind-merge for class name utilities

**Development Tools**
- TypeScript for static typing
- ESBuild for server bundling
- TSX for TypeScript execution in development
- Replit-specific plugins for development experience

**Image Assets**
- Local image storage in /attached_assets/generated_images/
- Static file serving through Express/Vite

**Design Tokens**
- Custom CSS variables for theming
- HSL color format for dynamic color manipulation
- Automatic border computation for interactive elements