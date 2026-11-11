import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative paths so the built game works from any folder or sub-path
  // (GitHub Pages, Netlify, Vercel, a USB stick...).
  base: './',
  server: { port: 5173 },
  build: {
    // Phaser is large; keep it in its own file so the game code stays small.
    rolldownOptions: {
      output: {
        advancedChunks: { groups: [{ name: 'phaser', test: /node_modules[\\/]phaser/ }] },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
  test: { include: ['src/**/*.test.ts'] },
});
