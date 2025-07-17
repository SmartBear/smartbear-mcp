import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      exclude: [
        'dist/**',
        'node_modules/**',
        'tests/**',
        '*.config.*',
        '**/*.d.ts'
      ]
    },
    // Include TypeScript files
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Setup files
    setupFiles: []
  },
  // Resolve imports correctly for ESM
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
});
