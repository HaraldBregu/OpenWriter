import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';
import reactScan from '@react-scan/vite-plugin-react-scan';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        //'@renderer': resolve('src/renderer/src')
        '@': resolve(__dirname, './src/renderer/src'),
        '@utils': resolve(__dirname, './src/renderer/src/utils'),
        '@pages': resolve(__dirname, './src/renderer/src/pages'),
        '@store': resolve(__dirname, './src/renderer/src/store'),
        '@components': resolve(__dirname, './src/renderer/src/components'),
        '@icons': resolve(__dirname, './src/renderer/src/components/icons'),
        "@resources": resolve(__dirname, "buildResources"),
      }
    },
    plugins: [react(),
    tsconfigPaths(),
    svgr({
      svgrOptions: {
        icon: true,
        svgProps: {
          fill: "currentColor",
        },
      }
    }),
    reactScan({
      enable: true,
    }),
    ]
  }
})
