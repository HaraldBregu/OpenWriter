// env.d.ts
/// <reference types="vite/client" />

type AppEnvironment = 'development' | 'staging' | 'production'

interface ImportMetaEnv {
  // Environment
  readonly VITE_APP_ENV: AppEnvironment;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}