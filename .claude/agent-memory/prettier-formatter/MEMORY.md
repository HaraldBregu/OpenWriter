# Prettier Setup for OpenWriter Project

## Project Overview
- **Name**: OpenWriter
- **Type**: Electron + React + TypeScript desktop application
- **Package Manager**: Yarn
- **Node Setup**: ES modules (`"type": "module"`)

## Prettier Installation & Configuration (March 5, 2026)

### Installed Version
- Prettier: v3.8.1

### Configuration Files

#### .prettierrc
Location: `/c/Users/BRGHLD87H/Documents/OpenWriter/.prettierrc`
- printWidth: 100 (readable for TypeScript/React)
- tabWidth: 2
- useTabs: false
- semi: true
- singleQuote: true (JS/TS)
- jsxSingleQuote: false (JSX attributes use double quotes)
- trailingComma: es5 (compatible with older Node versions)
- bracketSpacing: true
- bracketSameLine: false
- arrowParens: always
- endOfLine: lf (Unix line endings)

#### .prettierignore
Standard ignores configured:
- node_modules, dist, out, build, coverage
- .git, .github, .claude
- Lock files (yarn.lock, package-lock.json, pnpm-lock.yaml)
- Environment files (.env, .env.local)
- IDE/editor files (.vscode, .idea, *.swp, *.swo)
- Minified files (*.min.js, *.min.css)

### Scripts Added to package.json
```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

## Existing Project Setup
- ESLint configured with @electron-toolkit/eslint-config-ts
- TypeScript: 5.8.3
- React: 19.0.0
- Tailwind CSS: 3.3.3
- Uses path aliases (@/, @utils, @pages, @store, @components, @icons, @resources)

## Notes
- ESLint-config-prettier NOT installed (decision: can be added if conflicts arise)
- Project uses ES modules with TypeScript
- No conflicts detected with current setup
- Prettier is ready to format code
