/**
 * PC content callout UI audit.
 *
 * This gate intentionally checks migrated static content callouts. Overview
 * navigation cards are covered separately by audit-card-ui.ts.
 */

import { readFileSync } from 'node:fs';
import { chromium, type Browser, type Locator, type Page } from 'playwright';

const baseUrl = process.env.CARD_AUDIT_BASE_URL || 'http://127.0.0.1:5174';
const hashBase = `${baseUrl.replace(/\/$/, '')}/#`;

const sourceFilesWithoutRawBorderLeft = [
  'src/modules/sops/views/growth/restricted_words/restrictedWordsHandler.ts',
];

interface Target {
  allowedRawBorderLeftCount?: number;
  expectedCount: number;
  name: string;
  path: string;
  selector: string;
  templatePath: string;
}

interface CalloutState {
  background: string;
  borderColor: string;
  boxShadow: string;
  radius: string;
  transform: string;
}

interface MarkerTarget {
  expectedCount: number;
  expectedPaddingLeft: string;
  name: string;
  path: string;
  selector: string;
}

interface MarkerState {
  borderLeftColor: string;
  borderLeftStyle: string;
  borderLeftWidth: string;
  paddingLeft: string;
}

const targets: Target[] = [
  {
    expectedCount: 18,
    name: 'New Product 30 Days callout',
    path: '/amz-hub/advanced/new-product-30days',
    selector: '.np30-page .content-callout',
    templatePath: 'src/modules/amz_hub/views/advanced/new_product_30days/template.html',
  },
  {
    expectedCount: 16,
    name: 'Conversion Optimization callout',
    path: '/amz-hub/advanced/conversion-optimization',
    selector: '.cvo-page .content-callout',
    templatePath: 'src/modules/amz_hub/views/advanced/conversion_optimization/template.html',
  },
  {
    expectedCount: 11,
    name: 'Quality Listing callout',
    path: '/amz-hub/practice/quality-listing',
    selector: '.ql-page .content-callout',
    templatePath: 'src/modules/amz_hub/views/practice/quality_listing/template.html',
  },
  {
    expectedCount: 12,
    name: 'Listing SEO callout',
    path: '/sops/growth/listing-seo',
    selector: '.listing-seo-page .content-callout',
    templatePath: 'src/modules/sops/views/growth/listing_seo/template.html',
  },
  {
    expectedCount: 11,
    name: 'Negative Review callout',
    path: '/sops/service/negative-review',
    selector: '.negative-review-page .content-callout',
    templatePath: 'src/modules/sops/views/service/negative_review/template.html',
  },
  {
    expectedCount: 6,
    name: 'QA Maintenance callout',
    path: '/sops/service/qa-maintenance',
    selector: '.qa-maintenance-page .content-callout',
    templatePath: 'src/modules/sops/views/service/qa_maintenance/template.html',
  },
  {
    expectedCount: 5,
    name: 'FBA Shipping callout',
    path: '/sops/backend/fba-shipping',
    selector: '.fba-shipping-page .content-callout',
    templatePath: 'src/modules/sops/views/backend/fba_shipping/template.html',
  },
  {
    expectedCount: 5,
    name: 'Performance Notification callout',
    path: '/sops/safety/performance-notification',
    selector: '.performance-notification-page .content-callout',
    templatePath: 'src/modules/sops/views/safety/performance_notification/template.html',
  },
  {
    expectedCount: 4,
    name: 'Account Security callout',
    path: '/sops/safety/account-security',
    selector: '.account-security-page .content-callout',
    templatePath: 'src/modules/sops/views/safety/account_security/template.html',
  },
  {
    expectedCount: 4,
    name: 'Inventory Replenishment callout',
    path: '/sops/backend/inventory-replenishment',
    selector: '.inventory-replenishment-page .content-callout',
    templatePath: 'src/modules/sops/views/backend/inventory_replenishment/template.html',
  },
  {
    expectedCount: 4,
    name: 'NPI Tracker callout',
    path: '/sops/growth/npi-tracker',
    selector: '.npi-tracker-page .content-callout',
    templatePath: 'src/modules/sops/views/growth/npi_tracker/template.html',
  },
  {
    expectedCount: 7,
    name: 'Promotion Submission callout',
    path: '/sops/growth/promotion-submission',
    selector: '.promotion-submission-page .content-callout',
    templatePath: 'src/modules/sops/views/growth/promotion_submission/template.html',
  },
  {
    expectedCount: 4,
    name: 'Brand Infringement callout',
    path: '/sops/safety/brand-infringement',
    selector: '.brand-infringement-page .content-callout',
    templatePath: 'src/modules/sops/views/safety/brand_infringement/template.html',
  },
  {
    expectedCount: 3,
    name: 'A10 COSMO ecosystem callout',
    path: '/amz-hub/knowledge/ecosystem',
    selector: '.eco-page .content-callout',
    templatePath: 'src/modules/amz_hub/views/knowledge/ecosystem/template.html',
  },
  {
    expectedCount: 4,
    name: 'PPC Advertising callout',
    path: '/sops/growth/ppc-advertising',
    selector: '.ppc-advertising-page .content-callout',
    templatePath: 'src/modules/sops/views/growth/ppc_advertising/template.html',
  },
];

const markerTargets: MarkerTarget[] = [
  {
    expectedCount: 4,
    expectedPaddingLeft: '16px',
    name: 'PPC phase marker',
    path: '/sops/growth/ppc-advertising',
    selector: '.ppc-advertising-page .sop-phase-marker',
  },
  {
    expectedCount: 4,
    expectedPaddingLeft: '12px',
    name: 'Brand risk heading marker',
    path: '/sops/safety/brand-infringement',
    selector: '.brand-infringement-page .brand-risk-heading',
  },
];

function extractInsetRailColor(boxShadow: string): string | null {
  const shadows = boxShadow.split(/,\s(?=(?:rgb|rgba)\()/);
  const rail = shadows.find((shadow) => shadow.includes('inset') && shadow.includes('4px 0px 0px 0px'));

  if (!rail || rail.includes('rgba(0, 0, 0, 0)')) return null;
  return rail.match(/rgba?\([^)]+\)/)?.[0] ?? null;
}

async function waitForVisibleTarget(page: Page, selector: string): Promise<void> {
  await page.waitForFunction(
    (targetSelector) => {
      return Array.from(document.querySelectorAll<HTMLElement>(targetSelector)).some((element) => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);

        return (
          rect.width > 40 &&
          rect.height > 16 &&
          styles.display !== 'none' &&
          styles.visibility !== 'hidden'
        );
      });
    },
    selector,
    { timeout: 20000 },
  );
}

async function readCallout(locator: Locator): Promise<CalloutState | null> {
  return locator.evaluate((callout) => {
    const rect = callout.getBoundingClientRect();
    const styles = getComputedStyle(callout);

    if (
      rect.width <= 40 ||
      rect.height <= 24 ||
      styles.display === 'none' ||
      styles.visibility === 'hidden'
    ) {
      return null;
    }

    return {
      background: styles.backgroundColor,
      borderColor: styles.borderTopColor,
      boxShadow: styles.boxShadow,
      radius: styles.borderTopLeftRadius,
      transform: styles.transform,
    };
  });
}

async function auditTarget(page: Page, target: Target): Promise<string[]> {
  const failures: string[] = [];

  await page.goto(`${hashBase}${target.path}`, { waitUntil: 'commit', timeout: 30000 });
  await waitForVisibleTarget(page, target.selector);

  const callouts = page.locator(target.selector);
  const count = await callouts.count();

  if (count !== target.expectedCount) {
    failures.push(`${target.name}: expected ${target.expectedCount} callouts, got ${count}`);
  }

  for (let index = 0; index < count; index += 1) {
    const callout = callouts.nth(index);

    if (!(await callout.isVisible())) {
      continue;
    }

    await callout.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    const base = await readCallout(callout);

    if (!base) {
      failures.push(`${target.name} #${index + 1}: visible callout could not be sampled`);
      continue;
    }

    await callout.hover({ force: true });
    await page.waitForTimeout(220);
    const hover = await readCallout(callout);
    const railColor = extractInsetRailColor(base.boxShadow);

    if (base.radius !== '8px') {
      failures.push(`${target.name} #${index + 1}: expected 8px radius, got ${base.radius}`);
    }

    if (!railColor) {
      failures.push(`${target.name} #${index + 1}: expected visible default 4px inset rail`);
    }

    if (base.borderColor === 'rgba(0, 0, 0, 0)') {
      failures.push(`${target.name} #${index + 1}: expected complete card border`);
    }

    if (base.background === 'rgba(0, 0, 0, 0)') {
      failures.push(`${target.name} #${index + 1}: expected semantic background`);
    }

    if (hover?.transform !== 'none') {
      failures.push(`${target.name} #${index + 1}: expected no hover transform, got ${hover?.transform}`);
    }
  }

  return failures;
}

async function readMarker(locator: Locator): Promise<MarkerState | null> {
  return locator.evaluate((marker) => {
    const rect = marker.getBoundingClientRect();
    const styles = getComputedStyle(marker);

    if (
      rect.width <= 40 ||
      rect.height <= 16 ||
      styles.display === 'none' ||
      styles.visibility === 'hidden'
    ) {
      return null;
    }

    return {
      borderLeftColor: styles.borderLeftColor,
      borderLeftStyle: styles.borderLeftStyle,
      borderLeftWidth: styles.borderLeftWidth,
      paddingLeft: styles.paddingLeft,
    };
  });
}

async function auditMarkerTarget(page: Page, target: MarkerTarget): Promise<string[]> {
  const failures: string[] = [];

  await page.goto(`${hashBase}${target.path}`, { waitUntil: 'commit', timeout: 30000 });
  await waitForVisibleTarget(page, target.selector);

  const markers = page.locator(target.selector);
  const count = await markers.count();

  if (count !== target.expectedCount) {
    failures.push(`${target.name}: expected ${target.expectedCount} markers, got ${count}`);
  }

  for (let index = 0; index < count; index += 1) {
    const marker = markers.nth(index);

    if (!(await marker.isVisible())) {
      continue;
    }

    const state = await readMarker(marker);

    if (!state) {
      failures.push(`${target.name} #${index + 1}: visible marker could not be sampled`);
      continue;
    }

    if (state.borderLeftWidth !== '4px') {
      failures.push(`${target.name} #${index + 1}: expected 4px left marker, got ${state.borderLeftWidth}`);
    }

    if (state.borderLeftStyle !== 'solid') {
      failures.push(`${target.name} #${index + 1}: expected solid left marker, got ${state.borderLeftStyle}`);
    }

    if (state.borderLeftColor === 'rgba(0, 0, 0, 0)') {
      failures.push(`${target.name} #${index + 1}: expected visible semantic marker color`);
    }

    if (state.paddingLeft !== target.expectedPaddingLeft) {
      failures.push(
        `${target.name} #${index + 1}: expected ${target.expectedPaddingLeft} left padding, got ${state.paddingLeft}`,
      );
    }
  }

  return failures;
}

async function main(): Promise<void> {
  for (const sourcePath of sourceFilesWithoutRawBorderLeft) {
    const source = readFileSync(sourcePath, 'utf8');

    if (source.includes('border-l-4')) {
      console.error(`${sourcePath}: raw border-l-4 remains in migrated dynamic callout source.`);
      process.exitCode = 1;
      return;
    }
  }

  for (const target of targets) {
    const template = readFileSync(target.templatePath, 'utf8');
    const allowedRawBorderLeftCount = target.allowedRawBorderLeftCount ?? 0;
    const rawBorderLeftCount = template.match(/border-l-4/g)?.length ?? 0;

    if (rawBorderLeftCount !== allowedRawBorderLeftCount) {
      console.error(
        `${target.templatePath}: expected ${allowedRawBorderLeftCount} raw border-l-4 occurrences, got ${rawBorderLeftCount}.`,
      );
      process.exitCode = 1;
      return;
    }
  }

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const viewport = { width: 1440, height: 1000 };
    const page = await browser.newPage({ viewport });
    const failures: string[] = [];

    for (const target of targets) {
      failures.push(...(await auditTarget(page, target)));
    }

    for (const target of markerTargets) {
      const markerPage = await browser.newPage({ viewport });
      try {
        failures.push(...(await auditMarkerTarget(markerPage, target)));
      } finally {
        await markerPage.close();
      }
    }

    if (failures.length > 0) {
      console.error('Callout UI audit failed:');
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `Callout UI audit passed for ${targets.length} migrated PC content target and ${markerTargets.length} semantic marker target.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Callout UI audit could not run.');
    console.error(`Base URL: ${baseUrl}`);
    console.error('Start the local dev server first, for example: npm run dev:simple');
    console.error(message);
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
}

void main();
