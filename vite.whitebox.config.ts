import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{target:'es2022',outDir:'.whitebox-dist',chunkSizeWarningLimit:1600,rollupOptions:{input:'whitebox.html'}}});
