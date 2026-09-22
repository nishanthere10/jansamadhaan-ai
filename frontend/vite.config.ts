import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet', 'react-leaflet', 'leaflet.heat'],
          recharts: ['recharts'],
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        // Must match the documented backend port (README, setup.md,
        // backend/.env.example all use 8001). This previously pointed at 8000,
        // so every dev API call failed with a proxy error.
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
});
