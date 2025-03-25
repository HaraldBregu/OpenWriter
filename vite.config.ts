import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(),],
  optimizeDeps: {
    include: ['@material-design-icons/font']
  },
  base: './',
  build: {
    outDir: 'dist-react',
  },
  server: {
    port: 5123,
    strictPort: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
      '@utils': path.resolve(__dirname, './src/renderer/src/utils'),
      '@pages': path.resolve(__dirname, './src/renderer/src/pages'),
      '@store': path.resolve(__dirname, './src/renderer/src/store'),
      '@components': path.resolve(__dirname, './src/renderer/src/components'),
      '@resources': path.resolve(__dirname, './resources')
    }
  }
});