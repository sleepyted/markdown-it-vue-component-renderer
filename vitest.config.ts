import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    tsconfig: './tsconfig.vitest.json'
  }
});
