import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173, strictPort: true },
  build: {
    target: 'es2022',
    // Phase 6 tracks total page weight against the 5 MB budget; surface it early.
    reportCompressedSize: true,
    chunkSizeWarningLimit: 600,
  },
});
