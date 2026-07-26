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
 * First scaffold slice only (3 screens × 2 appearances = 6 snapshots).
 * Full light main pack (R1–R9 × 2) remains plan-only until XO + baselines stabilize.
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
