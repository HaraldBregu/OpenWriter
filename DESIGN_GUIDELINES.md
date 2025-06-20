# React + TypeScript Design Guidelines

## Project Structure

This application is built using React and TypeScript with `src/` as the root directory. Inside `src/`, the structure is organized into three main subfolders:

```txt
src/
├── main/       # Main process logic (Electron, Node.js APIs)
├── preload/    # Preload scripts (secure bridge between main and renderer)
└── renderer/   # Frontend application (React UI)
```

Each of these folders is independent and serves a clear architectural purpose, helping maintain separation of concerns and modularity in the codebase.

### 1. `main/`

This folder contains the logic responsible for the main process. It typically includes:

- Application lifecycle management (starting, quitting)
- IPC (Inter-Process Communication) listeners and senders
- Main window creation and configuration
- Backend logic (e.g., file system access, native modules, Node.js APIs)

**Guidelines:**

- Keep all Electron-specific and Node.js-related code inside this folder.
- Use TypeScript for type safety and improved development experience.
- Separate concerns by using subfolders (e.g., `windows/`, `ipc/`, `utils/`).

### 2. `preload/`

This folder is used for preload scripts, which act as a secure bridge between the `main` process and the `renderer` process.

**Responsibilities:**

- Expose limited and secure APIs to the renderer.
- Handle context isolation.
- Use `contextBridge` and `ipcRenderer` as needed.

**Guidelines:**

- Do not expose Node.js APIs directly.
- Keep the API surface small and well-defined.
- Export all bridge APIs through a single entry point (e.g., `preload/index.ts`).

### 3. `renderer/`

This folder contains the frontend of the application. It includes all the React components, TypeScript types, hooks, and UI logic.

**Structure:**

```txt
renderer/
├── src/
│   ├── components/    # Reusable UI components
│   ├── pages/        # Route-based views or screens
│   ├── hooks/        # Custom React hooks
│   ├── store/        # State management
│   ├── types/        # TypeScript interfaces and types
│   ├── utils/        # Utility functions
│   ├── lib/          # Shared libraries and configurations
│   ├── App.tsx       # Main application component
│   ├── AppTabs.tsx   # Tab navigation component
│   ├── main.tsx      # Application entry point
│   ├── i18n.ts       # Internationalization setup
│   └── theming.tsx   # Theme configuration
└── index.html        # HTML entry point
```

**Guidelines:**

- Favor functional components and React hooks.
- Use TypeScript interfaces for props and state.
- Maintain separation of concerns between UI and business logic.
- Use absolute imports with path aliases for better maintainability.
- Follow the established folder structure for new features.

## Project Configuration

The project uses several configuration files in the root directory:

- `electron.vite.config.ts` - Vite configuration for Electron
- `tsconfig.json` - Base TypeScript configuration
- `tsconfig.web.json` - Web-specific TypeScript configuration
- `tsconfig.node.json` - Node-specific TypeScript configuration
- `tailwind.config.cjs` - Tailwind CSS configuration
- `components.json` - UI components configuration
- `eslint.config.mjs` - ESLint configuration

## Internationalization

The project supports multiple languages through the `i18n/` directory. Use the `i18n.ts` setup in the renderer for translations.

## Naming Conventions

### File Naming

1. **Reusable Components**
   - All reusable components (except page components) should use snake case naming
   - Example: `button_group.tsx`, `data_table.tsx`, `form_input.tsx`
   - This applies to components in `components/`, `lib/`, and any other shared component directories

2. **Page Components**
   - Page components should use Pascal case naming
   - Example: `HomePage.tsx`, `SettingsPage.tsx`, `UserProfile.tsx`
   - These are typically located in the `pages/` directory

3. **Hooks**
   - Custom hooks should use camel case with 'use' prefix
   - Example: `useWindowSize.ts`, `useLocalStorage.ts`

4. **Utility Files**
   - Utility files should use camel case
   - Example: `formatDate.ts`, `validationUtils.ts` 

5. **Type Definitions**
   - Type definition files should use camel case
   - Example: `userTypes.ts`, `apiTypes.ts`

### Component Naming

1. **Component Names**
   - Component names should use Pascal case
   - Example: `ButtonGroup`, `DataTable`, `FormInput`
   - This applies regardless of the file naming convention

2. **Interface/Type Names**
   - Interface names should be Pascal case and prefixed with 'I' for interfaces
   - Example: `IButtonProps`, `IUserData`
   - Type aliases should be Pascal case without prefix
   - Example: `ButtonVariant`, `UserRole`

### Variable and Function Naming

1. **Variables**
   - Use camel case for variables
   - Example: `userData`, `isLoading`, `handleSubmit`

2. **Functions**
   - Use camel case for functions
   - Event handlers should be prefixed with 'handle'
   - Example: `handleClick`, `handleSubmit`, `fetchData`

3. **Constants**
   - Use UPPER_SNAKE_CASE for constants
   - Example: `MAX_RETRY_COUNT`, `API_BASE_URL`

### Import/Export Naming

1. **Default Exports**
   - Use Pascal case for default exports
   - Example: `export default ButtonGroup`

2. **Named Exports**
   - Use camel case for named exports
   - Example: `export const formatDate`, `export const validateInput`


