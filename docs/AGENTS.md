# AGENTS.md - Tesseract AI Development Guide

This file provides guidance for agentic coding agents working in this repository.

## Project Overview

Tesseract AI is an Electron-based advanced text editor application built with React, TypeScript, and Electron-Vite. It handles custom `.tsrct` file format and supports multi-platform distribution.

## Build Commands

### Development
```bash
npm run dev              # Start dev mode with debugging
npm run dev:staging      # Start dev in staging environment
npm run dev:prod         # Start dev in production environment
npm run dev-linux        # Dev mode for Linux (sandbox disabled)
```

### Building
```bash
npm run build            # Production build (includes typecheck)
npm run build:dev        # Development build
npm run build:staging    # Staging build
npm run typecheck        # Run TS checks for main + renderer
npm run typecheck:node   # TypeScript check for main process only
npm run typecheck:web    # TypeScript check for renderer only
```

### Linting & Testing
```bash
npm run lint             # Run ESLint
npm test                 # Run Jest tests
```

For running a **single test file**, use Jest's `--testPathPattern` flag:
```bash
npm test -- --testPathPattern="filename.test"
# Example: npm test -- --testPathPattern="filesystem"
```

### Distribution
```bash
npm run dist-win         # Build Windows distributable
npm run dist-win:dev     # Build Windows dev version
npm run dist-win:staging # Build Windows staging version
npm run dist-mac         # Build macOS distributable
npm run dist-linux       # Build Linux distributable
```

### Utilities
```bash
npm run clean            # Clean build artifacts
npm run generate-icons  # Generate app icons
```

---

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled** in `tsconfig.json`
- Use explicit type annotations for function parameters and return types
- Use interfaces for object shapes (preferred over types)
- Path aliases configured: `@/*`, `@utils/*`, `@pages/*`, `@store/*`, `@components/*`, `@icons/*`, `@resources/*`

### Import Conventions

**Electron modules:**
```typescript
import { app, BrowserWindow, dialog } from 'electron'
```

**Node.js built-ins:**
```typescript
import fs from 'node:fs'
import path from 'node:path'
```

**React (use named imports):**
```typescript
import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
```

**Third-party libraries:**
```typescript
import { Sidebar, SidebarContent } from '@/components/ui/sidebar'
import { Home, Camera, Mic } from 'lucide-react'
```

**Local modules (relative paths for siblings):**
```typescript
import { FilesystemService } from './services/filesystem'
import { Main } from './main'
```

### Naming Conventions

- **Classes/Components:** PascalCase (e.g., `FilesystemService`, `AppLayout`)
- **Functions:** camelCase (e.g., `openFileDialog`, `isTsrctFile`)
- **Variables/Constants:** camelCase (e.g., `filePath`, `TSRCT_EXT`)
- **Interfaces:** PascalCase with descriptive names (e.g., `FileInfo`, `FsWatchEvent`)
- **Boolean variables:** Prefix with `is`, `has`, `should` (e.g., `isVisible`, `hasContent`)

### React Component Patterns

**Functional components with explicit props interface:**
```typescript
interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  // component implementation
}
```

**Use `as Child` pattern with Radix UI:**
```typescript
<SidebarMenuButton asChild isActive={isActive}>
  <Link to={url}>Content</Link>
</SidebarMenuButton>
```

**Inline interfaces for inline components:**
```typescript
function NavGroupSection({
  group,
  currentPath
}: {
  group: NavGroup
  currentPath: string
}) { }
```

### Error Handling

- Use `try/catch` for async operations
- Return proper error states (e.g., `{ success: false, filePath: null }`)
- Handle null/undefined cases explicitly (use optional chaining `?.` and nullish coalescing `??`)
- Log errors appropriately in main process

### ESLint Configuration

The project uses:
- `@electron-toolkit/eslint-config-ts` (base config)
- `eslint-plugin-react` with recommended settings
- `eslint-plugin-react-hooks` for hooks rules
- `eslint-plugin-react-refresh` for Vite HMR compatibility

Ignored paths: `node_modules`, `dist`, `out`, `src/renderer`, `scripts/*.cjs`

### File Organization

```
src/
├── main/                 # Electron main process
│   ├── index.ts         # Entry point
│   ├── main.ts          # Main window class
│   ├── menu.ts         # Application menu
│   ├── tray.ts         # System tray
│   ├── services/       # Business logic services
│   └── types/          # TypeScript type definitions
├── preload/             # Preload scripts
│   └── index.ts        # Context bridge
└── renderer/           # React frontend
    └── src/
        ├── components/  # React components
        ├── pages/      # Page components
        ├── store/      # Redux state management
        └── utils/      # Utility functions
```

### Tailwind CSS Usage

- Use utility classes for styling
- Follow shadcn/ui component patterns
- Use `cn()` utility from `tailwind-merge` for conditional classes:
```typescript
import { cn } from '@/lib/utils'

<div className={cn("base-class", condition && "conditional-class")} />
```

---

## Special Considerations

1. **Electron IPC:** Use contextBridge in preload to expose safe APIs to renderer
2. **macOS specific:** Handle `open-file` event for file associations
3. **Window management:** App continues in system tray when all windows close
4. **Custom file format:** `.tsrct` files are handled specially
5. **Hash-based routing:** Use React Router with hash history for Electron compatibility
