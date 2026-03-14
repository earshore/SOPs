// tests/playwright.d.ts
// ================================================================
// 🎭 Playwright 类型声明
// ================================================================

import { Page } from '@playwright/test';

declare global {
  interface Window {
    Alpine: any;
    useAppStore: any;
    router: any;
  }
}

export {};
