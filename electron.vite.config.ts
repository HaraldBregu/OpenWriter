import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  main: {
    envPrefix: ['MAIN_VITE_', 'VITE_'],
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
        output: {
          entryFileNames: "[name].js",
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: '[name].js'  // Use .js instead of .mjs for Electron compatibility
        }
      }
    }
  },
  renderer: {
    publicDir: resolve(__dirname, './src/renderer/public'),
    resolve: {
      alias: {
        '@': resolve(__dirname, './src/renderer/src'),
        '@utils': resolve(__dirname, './src/renderer/src/utils'),
        '@pages': resolve(__dirname, './src/renderer/src/pages'),
        '@store': resolve(__dirname, './src/renderer/src/store'),
        '@components': resolve(__dirname, './src/renderer/src/components'),
        '@icons': resolve(__dirname, './src/renderer/src/components/icons'),
        "@resources": resolve(__dirname, "resources"),
      }
    },
    plugins: [
      react(),
      tsconfigPaths({ ignoreConfigErrors: true })
    ]
  }
})
