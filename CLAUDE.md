# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tesseract is an Electron-based advanced text editor application. It's built with React, TypeScript, and uses Electron-Vite for the build system. The application supports multi-platform distribution (Windows, macOS, Linux) and handles custom file formats (.tsx).

## Development Commands

### Core Development Commands
- `npm run dev` - Start development mode with debugging
- `npm run dev:staging` - Start development in staging environment
- `npm run dev:prod` - Start development in production environment
- `npm run dev-linux` - Development mode for Linux (with sandbox disabled)

### Build Commands
- `npm run build` - Production build (includes typecheck)
- `npm run build:dev` - Development build
- `npm run build:staging` - Staging build
- `npm run typecheck` - Run TypeScript checks for both main and renderer processes
- `npm run typecheck:node` - TypeScript check for main process only
- `npm run typecheck:web` - TypeScript check for renderer process only

### Testing and Quality
- `npm test` - Run Jest tests
- `npm run lint` - Run ESLint
- Jest configuration includes coverage thresholds (50% minimum) and supports React Testing Library

### Distribution
- `npm run dist-all` - Build distributables for all platforms
- `npm run dist-win` / `npm run dist-linux` / `npm run dist-mac` - Platform-specific builds
- Environment-specific variants available: `:dev` and `:staging` suffixes

### Utilities
- `npm run clean` - Clean build artifacts and caches
- `npm run svgr` - Generate React components from SVG files
- `npm run generate-icons` - Generate app icons from source

## Architecture

### Electron Multi-Process Architecture
- **Main Process** (`src/main/`): Node.js backend handling file system, menus, windows
  - `index.ts` - Main entry point and window management
  - `services/` - Core business logic and API integrations
  - `document/` - Document management and file handling
  - `shared/` - Utilities shared between main and renderer
  - `workers/` - Background processing (includes search worker)
  - `menu/` - Application menu definitions

- **Renderer Process** (`src/renderer/src/`): React frontend
  - React Router with hash-based routing for Electron compatibility
  - Redux Toolkit for state management (`store/`)
  - Components using Radix UI primitives and Tailwind CSS
  - TipTap rich text editor integration
  - Multi-language support with react-i18next

- **Preload Scripts** (`src/preload/`): Secure bridge between main and renderer

### Key Technologies
- **Frontend**: React 19, TypeScript, Tailwind CSS, Radix UI, TipTap editor
- **State Management**: Redux Toolkit with Redux Saga
- **Styling**: Tailwind CSS with custom design system
- **Testing**: Jest with React Testing Library, jsdom environment
- **Build System**: Electron-Vite with Vite plugins for React and SVGR

### File Structure Conventions
- Path aliases configured in vite config: `@/`, `@utils/`, `@pages/`, `@store/`, `@components/`, `@icons/`, `@resources/`
- SVG icons auto-generated as React components
- Environment-specific configurations (.env.development, .env.staging, .env.production)

### Custom File Format
The application handles `.tsx` files (Tesseract documents) with proper file associations configured for all target platforms.

## Environment Requirements
- Node.js >= 22.0.0
- Yarn package manager (configured with .yarnrc.yml)

## Special Considerations
- Multi-platform Electron app with platform-specific build configurations
- Uses hash-based routing for Electron compatibility
- Lazy loading implemented for secondary windows/modals
- Worker threads for background processing (search functionality)
- Print preview integration with external Java components
- Multi-language support with i18n resources
- Custom document format with platform-specific file associations