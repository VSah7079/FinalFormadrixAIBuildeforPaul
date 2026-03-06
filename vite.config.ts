import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Required for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages':      path.resolve(__dirname, 'src/pages'),
      '@theme':      path.resolve(__dirname, 'src/theme'),
      '@types':      path.resolve(__dirname, 'src/types'),
      '@hooks':      path.resolve(__dirname, 'src/hooks'),
      '@contexts':   path.resolve(__dirname, 'src/contexts'),
    },
  },

  server: {
    port: 5173,
    host: true,
    allowedHosts: true
  },

  build: {
    outDir: 'dist',
    sourcemap: true
  }
});