import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: {
    // The browser calls its own origin; Vite forwards API requests to Express.
    // This lets cookies work locally without cross-origin CORS configuration.
    proxy: { '/customers': 'http://127.0.0.1:5000' },
  },
});
