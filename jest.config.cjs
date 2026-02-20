/**
 * Jest configuration for Tesseract AI.
 *
 * Uses a multi-project setup:
 *   - "main"     : tests for the Electron main process (Node environment)
 *   - "renderer" : tests for the React renderer process (jsdom environment)
 *
 * ts-jest handles TypeScript compilation. Config is CJS to avoid needing
 * ts-node (the project uses "type": "module" in package.json).
 *
 * @type {import('jest').Config}
 */
module.exports = {
  projects: [
    // ---- Main process tests (Node env) ----
    {
      displayName: 'main',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/unit/main', '<rootDir>/tests/integration'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/tsconfig.node.json',
            useESM: false
          }
        ]
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      moduleNameMapper: {
        '^electron$': '<rootDir>/tests/mocks/electron.ts'
      },
      testMatch: ['**/*.test.ts']
    },

    // ---- Renderer process tests (jsdom env) ----
    {
      displayName: 'renderer',
      testEnvironment: 'jest-environment-jsdom',
      roots: ['<rootDir>/tests/unit/renderer'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/tsconfig.web.json',
            useESM: false
          }
        ]
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: {
        // Path aliases (match tsconfig.web.json and electron.vite.config.ts)
        '^@/(.*)$': '<rootDir>/src/renderer/src/$1',
        '^@utils/(.*)$': '<rootDir>/src/renderer/src/utils/$1',
        '^@pages/(.*)$': '<rootDir>/src/renderer/src/pages/$1',
        '^@store/(.*)$': '<rootDir>/src/renderer/src/store/$1',
        '^@components/(.*)$': '<rootDir>/src/renderer/src/components/$1',
        '^@icons/(.*)$': '<rootDir>/src/renderer/src/components/icons/$1',
        '^@resources/(.*)$': '<rootDir>/resources/$1',
        // Handle bare src/renderer/src imports used in some UI components
        '^src/renderer/src/(.*)$': '<rootDir>/src/renderer/src/$1',
        // Static asset stubs
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(png|jpg|jpeg|gif|svg|webp|ico)$': '<rootDir>/tests/mocks/fileMock.ts'
      },
      setupFiles: ['<rootDir>/tests/setup/polyfills.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/renderer.ts'],
      testMatch: ['**/*.test.ts', '**/*.test.tsx']
    }
  ],

  // Global coverage config
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main/index.ts',
    '!src/renderer/src/main.tsx',
    '!src/env.d.ts',
    '!src/types.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
}
