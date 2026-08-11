import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: 'tests/visual', webServer: { command: 'npm run build && npm run preview -w @sculpt/web -- --host 127.0.0.1', port: 4173, reuseExistingServer: true }, use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1440, height: 900 } } });
