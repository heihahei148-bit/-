import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiPort = Number(process.env.API_PORT || 3002);

export default defineConfig({
  root: path.resolve(__dirname, 'frontend'),
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5180,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
      '/uploads': `http://localhost:${apiPort}`
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/frontend'),
    emptyOutDir: true
  }
});
