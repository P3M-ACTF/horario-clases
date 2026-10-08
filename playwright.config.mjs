/*
 * SPDX-License-Identifier: GPL-3.0-only
 * Copyright (c) 2026 P3M-ACTF and contributors.
 * License: https://github.com/P3M-ACTF/horario-clases/blob/main/LICENSE
 */
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4173/horario-clases/',
    browserName: 'chromium',
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    viewport: { width: 1440, height: 1000 },
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4173/horario-clases/', reuseExistingServer: !process.env.CI, timeout: 15000 }
});
