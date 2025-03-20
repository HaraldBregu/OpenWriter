import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

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
        '@components': resolve(__dirname, './src/renderer/src/components')

      }
    },
    plugins: [react()]
  }
})
