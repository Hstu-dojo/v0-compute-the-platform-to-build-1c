# COMPUTE - AI Agents for Distributed Computing

## Project Overview
A Next.js 16 landing page for COMPUTE, a platform for deploying autonomous AI agents on distributed infrastructure. Originally built with v0.app and migrated from Vercel to Replit.

## Architecture
- **Framework**: Next.js 16 (App Router) with Turbopack
- **Styling**: Tailwind CSS v4 with shadcn/ui component library
- **Fonts**: Instrument Sans, Instrument Serif, JetBrains Mono (Google Fonts)
- **3D/Canvas**: Custom ASCII scene renderer using HTML Canvas (no Three.js runtime dependency in rendering)
- **Package Manager**: npm

## Directory Structure
- `app/` - Next.js App Router pages and layouts
- `components/landing/` - All landing page section components (all use client-side rendering)
- `components/ui/` - shadcn/ui base components
- `components/theme-provider.tsx` - Theme provider wrapper
- `lib/` - Utility functions
- `hooks/` - Custom React hooks
- `public/` - Static assets
- `styles/` - Global styles

## Running the App
- **Dev**: `npm run dev` (runs on port 5000, bound to 0.0.0.0 for Replit compatibility)
- **Build**: `npm run build`
- **Start**: `npm start` (production, port 5000)

## Replit Migration Notes
- Removed `@vercel/analytics` dependency (Vercel-specific, not needed on Replit)
- Updated dev/start scripts to use `-p 5000 -H 0.0.0.0` for Replit's preview system
- Added `allowedDevOrigins: ["*.replit.dev", "*.repl.co"]` to `next.config.mjs` to suppress cross-origin warnings
- Workflow: "Start application" runs `npm run dev` and serves on port 5000

## Key Configuration Files
- `next.config.mjs` - Next.js configuration with TypeScript error bypass, unoptimized images, allowed dev origins
- `components.json` - shadcn/ui configuration
- `tsconfig.json` - TypeScript configuration
