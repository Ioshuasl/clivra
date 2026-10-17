import { defineConfig, devices } from '@playwright/test';

/** Auditoria de UX/UI, desempenho e robustez â€” rodar contra o frontend em modo produÃ§Ã£o. */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.audit\.ts/,
  timeout: 600_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    ...devices['Desktop Chrome'],
    viewport: { width: 1366, height: 768 },
    locale: 'pt-BR',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
});

