// tests/visual/theme-appearance-scaffold.test.ts
// ================================================================
// D12 theme-axis scaffold (Appearance default vs minimal · light only)
//
// Skipped by default so normal `npm run test:visual` / CI smoke stay green.
// Opt in with THEME_VISUAL=1. Snapshots are local-mint only (gitignored);
// do NOT treat failures as visual Pass / RC gate.
//
// Manual run:
//   THEME_VISUAL=1 npm run test:visual:theme
//   THEME_VISUAL=1 npm run test:visual:theme:update
//
// Naming (short scaffold form; full plan matrix uses theme__r*__…):
//   theme-default-light-<screen>.png
//   theme-minimal-light-<screen>.png
//
// Plan: docs/superpowers/plans/2026-07-26-theme-visual-baseline-d12.md
// ================================================================

import { test, expect, type Page } from '@playwright/test';
import {
  ThresholdLevel,
  PageType,
  getThresholdConfig,
  getThresholdForPageType,
  adjustThresholdForViewport,
} from './threshold-config';

/** Opt-in flag — anything other than "1" leaves the suite skipped. */
const THEME_VISUAL_ENABLED = process.env.THEME_VISUAL === '1';

const DESKTOP = { width: 1280, height: 720 } as const;

type AppearanceId = 'default' | 'minimal';

interface ThemeScreen {
  /** Short slug used in snapshot file name after theme-{appearance}-light- */
  slug: string;
  path: string;
  pageType: PageType;
  waitForSelector?: string;
  maskSelectors?: string[];
  /**
   * When true, open System Settings → Appearance after navigation
   * (R7 Settings Appearance pair).
   */
  openAppearanceSettings?: boolean;
  beforeScreenshot?: (page: Page) => Promise<void>;
}

/**
 * Scaffold slice (11 screens × 2 appearances = 22 snapshots).
 * Ownership multi-color pages (App Center / Scraper / PromptLab / PPC / SOPs / Amazon Hub / Deep Chat / Skills) must NOT force primary.
 * Full light main pack (R1–R9 × 2) is covered; Skills catalog is an extra D6 sample. Visual Pass still requires human XO.
 */
const THEME_SCREENS: ThemeScreen[] = [
  {
    slug: 'settings-appearance',
    path: '/#/home',
    pageType: PageType.FORM,
    openAppearanceSettings: true,
    maskSelectors: ['.timestamp', '#time-display', '[data-dynamic="true"]', '.toast'],
  },
  {
    slug: 'keyword-hunter',
    path: '/#/app-center/keyword-hunter/input',
    pageType: PageType.FORM,
    waitForSelector: '#keyword-hunter-module-input',
    maskSelectors: ['.timestamp', '#keyword-hunter-keyword-highlight-layer', '[class*="animate-"]'],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('#keyword-hunter-module-input', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
  {
    slug: 'home',
    path: '/#/home',
    pageType: PageType.STATIC,
    waitForSelector: 'body',
    maskSelectors: ['.timestamp', '.current-time', '#time-display', '[data-dynamic="true"]'],
  },
  {
    // R2 — multi-color overview; ownership accents must NOT collapse to primary
    slug: 'app-center',
    path: '/#/app-center',
    pageType: PageType.LIST,
    waitForSelector: '.app-overview-container',
    maskSelectors: ['.timestamp', '[data-dynamic="true"]', '.toast'],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('.app-overview-container', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
  {
    // R3 sample — scraper ownership (wb-theme-indigo) NOT forced to primary
    slug: 'scraper',
    path: '/#/app-center/master-analysis/scraper',
    pageType: PageType.DATA_DISPLAY,
    waitForSelector: '[x-data="scraperPanel"]',
    maskSelectors: [
      '.timestamp',
      '#scraper-results',
      '.history-item',
      '#data-cards',
      '#json-display',
      '.task-card',
      '.progress-bar-fill',
      '[data-dynamic="true"]',
    ],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('[x-data="scraperPanel"]', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
  {
    // R3 sample — PromptLab ownership (wb-theme-indigo) NOT forced to primary
    slug: 'promptlab',
    path: '/#/app-center/master-analysis/promptlab',
    pageType: PageType.FORM,
    waitForSelector: '[x-data="promptlabPanel"]',
    maskSelectors: [
      '.timestamp',
      '#final-prompt-output',
      '[data-dynamic="true"]',
      '.toast',
      '[class*="animate-"]',
    ],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('[x-data="promptlabPanel"]', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
  {
    // R5 sample — .ppc-hero emerald ownership NOT forced to primary
    slug: 'ppc-search-terms',
    path: '/#/app-center/ppc-tools/ppc-search-terms',
    pageType: PageType.FORM,
    waitForSelector: '.ppc-search-terms-app',
    maskSelectors: ['.timestamp', '[class*="animate-"]', '[data-dynamic="true"]'],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('.ppc-search-terms-app', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
  {
    // R8 — SOPs overview ownership accents must NOT collapse to primary
    slug: 'sops-overview',
    path: '/#/sops',
    pageType: PageType.LIST,
    waitForSelector: '.sops-overview',
    maskSelectors: ['.timestamp', '[data-dynamic="true"]', '.toast'],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('.sops-overview', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
  {
    // R9 — Amazon Hub overview orange ownership must NOT collapse to primary
    slug: 'amz-hub-overview',
    path: '/#/amz-hub',
    pageType: PageType.LIST,
    waitForSelector: '.amz-hub-overview',
    maskSelectors: ['.timestamp', '[data-dynamic="true"]', '.toast'],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('.amz-hub-overview', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
  {
    // R6 — Deep Chat terracotta send/accent must NOT be asserted as primary
    slug: 'deep-chat',
    path: '/#/app-center/playground/deep-chat',
    pageType: PageType.FORM,
    waitForSelector: '#deep-chat-view',
    maskSelectors: [
      '.timestamp',
      '.deep-chat-thread-meta',
      '[data-dynamic="true"]',
      '.toast',
      '[class*="animate-"]',
    ],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('#deep-chat-view', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
  {
    // D6 #6 sample — Skills violet banner / multi-color badges NOT forced to primary
    slug: 'skills',
    path: '/#/more/explore/skills',
    pageType: PageType.LIST,
    waitForSelector: '.skills-page',
    maskSelectors: ['.timestamp', '[data-dynamic="true"]', '.toast', '[class*="animate-"]'],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('.skills-page', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
];

const APPEARANCES: AppearanceId[] = ['default', 'minimal'];

async function waitForStablePage(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Soft: some SPA routes never fully idle
  });
  await page.waitForTimeout(500);
}

/**
 * Seed Appearance + Color Mode before first navigation.
 * StorageService persists via JSON.stringify — values must be JSON strings.
 */
async function seedThemePreferences(page: Page, appearance: AppearanceId): Promise<void> {
  await page.addInitScript(
    ({ theme, colorMode }) => {
      window.localStorage.setItem('app-theme', JSON.stringify(theme));
      window.localStorage.setItem('app-color-mode', JSON.stringify(colorMode));
    },
    { theme: appearance, colorMode: 'light' as const }
  );
}

async function expectDocumentAppearance(page: Page, appearance: AppearanceId): Promise<void> {
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-appearance', appearance, { timeout: 15000 });
  // Backward-compat mirror (must never be "dark")
  await expect(root).toHaveAttribute('data-theme', appearance);
  await expect(root).toHaveAttribute('data-color-mode', 'light');
}

async function openAppearanceSettings(page: Page, appearance: AppearanceId): Promise<void> {
  await page.locator('#nav-more').click();
  await page.getByRole('button', { name: '全局设置' }).click();
  await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible({ timeout: 15000 });

  await page
    .locator('nav.settings-panel-nav')
    .getByRole('button', { name: '外观与体验', exact: true })
    .click();

  const appearanceSection = page.locator('#settings-section-appearance');
  await expect(appearanceSection).toBeVisible();
  await expect(page.getByTestId('settings-appearance-theme')).toBeVisible();
  await expect(page.getByTestId('settings-theme-select')).toBeVisible();
  await expect(page.getByTestId('settings-theme-select')).toHaveValue(appearance);
}

const suite = THEME_VISUAL_ENABLED ? test.describe : test.describe.skip;

suite('Theme appearance axis (D12 scaffold · opt-in THEME_VISUAL=1)', () => {
  test.use({ viewport: DESKTOP });

  test.describe.configure({ mode: 'serial' });

  for (const appearance of APPEARANCES) {
    for (const screen of THEME_SCREENS) {
      const snapshotName = `theme-${appearance}-light-${screen.slug}.png`;

      test(`theme appearance: ${screen.slug} ${appearance} light desktop`, async ({ page }) => {
        await seedThemePreferences(page, appearance);
        await page.goto(screen.path);

        if (screen.waitForSelector) {
          await page.waitForSelector(screen.waitForSelector, { timeout: 15000 });
        }

        await expectDocumentAppearance(page, appearance);

        if (screen.openAppearanceSettings) {
          await openAppearanceSettings(page, appearance);
        }

        if (screen.beforeScreenshot) {
          await screen.beforeScreenshot(page);
        }

        await waitForStablePage(page);

        // Full-page theme pairs use STANDARD; shell-only crops (future) may go STRICT.
        const thresholdConfig = adjustThresholdForViewport(
          screen.openAppearanceSettings
            ? getThresholdConfig(ThresholdLevel.STANDARD)
            : getThresholdForPageType(screen.pageType),
          'desktop'
        );

        await expect(page).toHaveScreenshot(snapshotName, {
          fullPage: true,
          animations: 'disabled',
          mask: screen.maskSelectors?.map(selector => page.locator(selector)) || [],
          threshold: thresholdConfig.threshold,
          maxDiffPixels: thresholdConfig.maxDiffPixels,
        });
      });
    }
  }
});
