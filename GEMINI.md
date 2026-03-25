# OpenWriter Project Context

OpenWriter is a professional, AI-powered desktop writing application built with Electron, React, and LangChain. It provides a distraction-free writing environment with advanced AI assistance, workspace organization, and resource indexing.

## Project Overview

- **Main Technologies:** Electron, React 19, TypeScript, Tailwind CSS.
- **Editor:** Tiptap (ProseMirror) for rich text editing.
- **AI Integration:** LangChain and LangGraph for LLM orchestration (OpenAI models).
- **State Management:** Redux Toolkit (Renderer) and a custom Service Container (Main).
- **Architecture:** 
    - **Main Process:** Service-based architecture with `ServiceContainer`, `EventBus`, and `WindowContextManager`. Supports isolated "Workspace Mode" where separate Electron processes are spawned for different workspaces.
    - **Preload:** Typed IPC bridge using Electron's `contextBridge`.
    - **Renderer:** Modern React 19 UI with a modular structure.

## Core Architecture & Patterns

### Main Process (src/main)
- **Service Container:** Manages global and window-scoped services (Store, Logger, TaskExecutor, etc.).
- **Task Management:** A robust `TaskExecutor` handles concurrent background tasks (AI calls, indexing) with progress streaming.
- **AI Agents:** Modular agent system (`AgentRegistry`) for different AI tasks like text completion, enhancement, and generation.
- **Workspace Isolation:** Each workspace can run in its own process to ensure stability and state isolation.
- **IPC Modules:** Organized into functional modules (`AppIpc`, `WorkspaceIpc`, `TaskIpc`, `WindowIpc`) registered during bootstrap.

### Renderer Process (src/renderer)
- **UI Framework:** React 19 with Tailwind CSS and Radix UI primitives.
- **Editor:** Custom Tiptap implementation with support for markdown, images, and AI-driven extensions.
- **State:** Redux for UI state; IPC calls for persistence and heavy logic.

### Shared (src/shared)
- **Types:** Single source of truth for IPC data shapes (`src/shared/types.ts`).
- **Constants:** Shared configuration and file extensions (`.tsrct`, `.openwriter`).

## Key Commands

### Development
- `yarn dev`: Starts the app in development mode with hot-reloading.
- `yarn dev:staging` / `yarn dev:prod`: Starts with specific environment modes.
- `yarn typecheck`: Runs TypeScript compiler checks for both Node and Web.

### Building & Packaging
- `yarn build`: Compiles the project for production.
- `yarn dist:mac`: Packages for macOS (pkg/dmg, x64/arm64).
- `yarn dist:win`: Packages for Windows (exe, x64).
- `yarn dist:linux:appimage`: Packages for Linux (AppImage).

### Testing
- `yarn test`: Runs Jest unit and integration tests.
- `yarn test:e2e`: Runs Playwright E2E tests.
- `yarn test:coverage`: Generates test coverage reports.

## Development Conventions

- **IPC Integrity:** All communication between Renderer and Main MUST use the typed interfaces defined in `src/shared/types.ts`.
- **Service Registration:** New backend logic should be implemented as a service and registered in `src/main/bootstrap.ts`.
- **Styling:** Use Tailwind CSS for all UI styling. Follow the custom design system based on Radix UI.
- **I18n:** Use the integrated i18next system for all user-facing strings (English and Italian supported).
- **Testing:** New features should include unit tests in `tests/unit` and, if applicable, E2E tests in `tests/e2e`.

## Directory Structure Highlights

- `src/main/core`: Core infrastructure (EventBus, ServiceContainer, etc.).
- `src/main/services`: Backend services (Store, Logger).
- `src/main/ai`: AI agent implementations and registry.
- `src/main/task_manager`: Task queue and execution logic.
- `src/renderer/src/components`: UI components (including Tiptap extensions).
- `docs/`: Comprehensive architecture and feature documentation.
- `resources/i18n`: Translation files.
