# CLAUDE.md

## Formatting

After each file edit, run `yarn format` to format the code with Prettier.

## File Naming Conventions

- **`.ts`** files: lowercase kebab-case (e.g., `my-component.ts`)
- **`.tsx`** files: PascalCase (e.g., `MyComponent.tsx`)
- **`.md`** files: UPPERCASE or UPPER_SNAKE_CASE (e.g., `README.md`, `GETTING_STARTED.md`)
- **`.json`** files: kebab-case, or lowercase if a single word (e.g., `tsconfig.json`, `my-config.json`)
- **Folders**: lowercase snake_case (e.g., `my_folder`, `user_settings`)

## Components

Always use the primary UI components from `src/renderer/src/components/ui/` first before creating new ones or importing from external libraries directly.

**Do NOT modify any files under `src/renderer/src/components/ui/` unless the user explicitly requests it.**

## SonarQube Best Practices

After implementing or modifying code, verify it follows SonarQube best practices:

- **No code smells**: Avoid duplicated code, overly complex functions, and dead code. Keep cognitive complexity low.
- **No bugs**: Ensure no null pointer dereferences, incorrect type comparisons, or unreachable code paths.
- **No vulnerabilities**: Avoid hardcoded credentials, SQL injection, XSS, and insecure randomness. Sanitize all user inputs.
- **No security hotspots**: Review usage of cryptography, file system access, HTTP requests, and dynamic code execution.
- **Maintainability**: Keep functions short and focused (single responsibility). Limit function parameters (max ~4). Avoid deeply nested control flow (max 3 levels).
- **Reliability**: Handle all error cases explicitly. Avoid empty catch blocks. Do not ignore return values.
- **Code quality rules**:
  - Do not use `any` type in TypeScript — use proper types or `unknown`.
  - Prefer `const` over `let`; never use `var`.
  - Do not leave `console.log` statements in production code.
  - Remove commented-out code instead of leaving it in.
  - Do not use magic numbers — extract them into named constants.
  - Avoid non-null assertions (`!`) — use proper null checks instead.
  - Do not add comments on every function or line of code — only add comments on important or complex functions where the logic is not self-evident.
