import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

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
    allowedHosts: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: true,

    // Raise warning threshold — SynopticReportPage is intentionally large
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        manualChunks: {
          // React core — changes rarely, cached aggressively by browsers
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // TipTap editor suite — ~400KB, only needed in SynopticReportPage
          // and ForMedrixEditor. Isolating it means every other page loads
          // without waiting for the editor bundle.
          'vendor-tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-color',
            '@tiptap/extension-highlight',
            '@tiptap/extension-image',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-text-align',
            '@tiptap/extension-text-style',
            '@tiptap/extension-typography',
            '@tiptap/extension-underline',
            '@tiptap/extension-table',
            '@tiptap/extension-table-cell',
            '@tiptap/extension-table-header',
            '@tiptap/extension-table-row',
            '@tiptap/extension-font-family',
            '@tiptap/extension-subscript',
            '@tiptap/extension-superscript',
            '@tiptap/extension-character-count',
            '@tiptap/extension-dropcursor',
          ],

          // xlsx — heavy, only used for export features
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
});

