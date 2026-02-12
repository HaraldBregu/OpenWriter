import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
        },
        output: {
          entryFileNames: "[name].js", // ✅ Ensure .js files are generated
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    publicDir: resolve(__dirname, './src/renderer/public'),
    resolve: {
      alias: {
        //'@renderer': resolve('src/renderer/src')
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
      tsconfigPaths(),
      svgr({
        svgrOptions: {
          icon: true,
          svgProps: {
            fill: "currentColor",
          },
        }
      }),
    ]
  }
})
