import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  publicDir: false,
  server: { host: '0.0.0.0' },
  build: { target: 'es2022', outDir: '.whitebox-dist/market', emptyOutDir: true,
    chunkSizeWarningLimit: 1600, rollupOptions: { input: 'market-whitebox.html' } },
});
