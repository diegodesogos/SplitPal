import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './client/src/test/setup.ts', // Updated path to setup file
    include: ['client/src/**/*.test.ts', 'client/src/**/*.test.tsx'], // <-- ADD THIS LINE
  },
  resolve: {
    alias: {
      // This ensures your test environment understands your path aliases
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'), // Added alias for shared directory
    },
  },
});
