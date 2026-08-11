import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@sculpt': fileURLToPath(new URL('./packages', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
