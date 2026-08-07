// tests/visual/theme-appearance-scaffold.test.ts
// ================================================================
// D12 theme-axis scaffold (Appearance default vs minimal · light + dark)
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
//   theme-default-dark-<screen>.png
//   theme-minimal-dark-<screen>.png
//
// Plan: docs/superpowers/plans/2026-07-26-theme-visual-baseline-d12.md
// T5 matrix: docs/superpowers/specs/2026-07-26-enterprise-theme-system-redesign.md
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
 * Scaffold slice (12 screens × 2 appearances = 24 snapshots).
 * Ownership multi-color pages (App Center / Scraper / PromptLab / PPC / SOPs / Amazon Hub / Deep Chat / Skills / NPI growth banner) must NOT force primary.
 * Full light main pack (R1–R9 × 2) is covered; Skills + NPI are extra D6 samples. Visual Pass still requires human XO.
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
  {
    // D6 #11 sample — NPI growth banner (wb-theme-growth) NOT forced to primary
    // Path/selector already D6-sampled + visual.test / release-smoke stable
    slug: 'npi-tracker',
    path: '/#/sops/growth/npi-tracker',
    pageType: PageType.LIST,
    waitForSelector: '.npi-tracker-page',
    maskSelectors: [
      '.timestamp',
      '#npi-results',
      '#npi-table-body',
      '[data-dynamic="true"]',
      '.toast',
      '[class*="animate-"]',
    ],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('.npi-tracker-page', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    },
  },
];

const APPEARANCES: AppearanceId[] = ['default', 'minimal'];

type ColorModeId = 'light' | 'dark';

/**
 * T5 matrix rows: Theme (light/dark) × Accent (default/minimal).
 * Dark rows assert the enterprise redesign — neutral surfaces flip, ownership
 * hue and Accent primary survive (no indigo stomp, no white islands).
 */
const COLOR_MODES: ColorModeId[] = ['light', 'dark'];

/**
 * Un-collapse the app scroll chain so fullPage captures the real content.
 *
 * Layout: body/html fixed height + overflow hidden; #main-content is flex-1
 * with overflow-y-auto; each module renders inside an absolute #panel-* with
 * overflow hidden, and content scrolls in <id>_content_area (h-full overflow,
 * e.g. sops_content_area). Without flattening the chain the page never scrolls
 * at document level and fullPage == viewport only.
 */
async function expandDocumentForFullPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const setFlow = (el: HTMLElement | null) => {
      if (!el) return;
      // Y-axis only: un-collapse vertical height while keeping the original
      // overflow-x clipping (wide tables/code blocks must not widen the page).
      el.style.overflowY = 'visible';
      el.style.height = 'auto';
    };
    setFlow(document.documentElement);
    setFlow(document.body);

    let node = document.querySelector<HTMLElement>('#main-content');
    while (node && node !== document.body) {
      setFlow(node);
      node = node.parentElement;
    }

    document
      .querySelectorAll<HTMLElement>('[id$="_content_area"]')
      .forEach(setFlow);

    // Module panels are absolutely positioned (out of document flow) and would
    // otherwise clip content; home splash is a fixed-height relative block.
    document
      .querySelectorAll<HTMLElement>(
        '#main-content [id^="panel-"], #main-content [id$="-splash-container"]'
      )
      .forEach((el) => {
        const pos = getComputedStyle(el).position;
        if (pos === 'absolute' || pos === 'fixed') el.style.position = 'static';
        setFlow(el);
      });
  });
}

/**
 * Flatten the System Settings modal (fixed full-screen overlay) so its whole
 * panel content participates in document flow and is included in fullPage.
 */
async function expandSettingsModalForFullPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.settings-panel-root');
    if (!root) return;
    root.style.position = 'static';
    root.style.overflow = 'visible';
    root.style.height = 'auto';
    for (const cls of ['.settings-panel-shell', '.settings-panel-scroll']) {
      const el = root.querySelector<HTMLElement>(cls);
      if (el) {
        el.style.height = 'auto';
        el.style.overflow = 'visible';
      }
    }
  });
}

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
async function seedThemePreferences(
  page: Page,
  appearance: AppearanceId,
  colorMode: ColorModeId
): Promise<void> {
  await page.addInitScript(
    ({ theme, mode }) => {
      window.localStorage.setItem('app-theme', JSON.stringify(theme));
      window.localStorage.setItem('app-color-mode', JSON.stringify(mode));
    },
    { theme: appearance, mode: colorMode }
  );
}

async function expectDocumentAppearance(
  page: Page,
  appearance: AppearanceId,
  colorMode: ColorModeId
): Promise<void> {
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-appearance', appearance, { timeout: 15000 });
  // Backward-compat mirror (must never be "dark")
  await expect(root).toHaveAttribute('data-theme', appearance);
  await expect(root).toHaveAttribute('data-color-mode', colorMode);
  await expect(root).toHaveAttribute('data-color-mode-resolved', colorMode);
}

async function openAppearanceSettings(page: Page, appearance: AppearanceId): Promise<void> {
  // Settings panel needs its Alpine x-data stack mounted before reveal (same
  // gate as release-smoke waitForSettingsPanel); clicking #nav-more earlier
  // races the drawer and can time out on the '全局设置' button.
  await page.waitForFunction(() => {
    const root = document.querySelector('[x-data="settingsPanel"]') as
      | (HTMLElement & { _x_dataStack?: unknown[] })
      | null;
    return Array.isArray(root?._x_dataStack);
  });
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

  for (const colorMode of COLOR_MODES) {
    for (const appearance of APPEARANCES) {
      for (const screen of THEME_SCREENS) {
        const snapshotName = `theme-${appearance}-${colorMode}-${screen.slug}.png`;

        test(`theme appearance: ${screen.slug} ${appearance} ${colorMode} desktop`, async ({
          page,
        }) => {
          await seedThemePreferences(page, appearance, colorMode);
          await page.goto(screen.path);

          if (screen.waitForSelector) {
            await page.waitForSelector(screen.waitForSelector, { timeout: 15000 });
          }

          await expectDocumentAppearance(page, appearance, colorMode);

          if (screen.openAppearanceSettings) {
            await openAppearanceSettings(page, appearance);
          }

          if (screen.beforeScreenshot) {
            await screen.beforeScreenshot(page);
          }

          // App content scrolls inside <id>_content_area containers (h-full
          // overflow-y-auto) with body/html fixed-height overflow hidden; a
          // plain fullPage capture only crops the 1280x720 window. Un-collapse
          // the scroll chain BEFORE the stability wait so reflow/scrollbar
          // settles before capture. The settings modal (fixed overlay) is
          // flattened only for its own screen; deep-chat stays a window
          // capture (app-style UI, not flowing content).
          await expandDocumentForFullPage(page);
          if (screen.openAppearanceSettings) {
            await expandSettingsModalForFullPage(page);
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
  }
});
