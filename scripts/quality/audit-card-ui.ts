/**
 * PC card UI audit.
 *
 * This gate intentionally checks only overview navigation cards. Static
 * callouts and dense workbench panels have different visual standards.
 */

import { chromium, type Browser, type Locator, type Page } from 'playwright';

const baseUrl = process.env.CARD_AUDIT_BASE_URL || 'http://127.0.0.1:5174';
const hashBase = `${baseUrl.replace(/\/$/, '')}/#`;

interface Target {
  compareIconAccent?: boolean;
  name: string;
  path: string;
  selector: string;
}

interface CardState {
  accentReferenceColor: string;
  background: string;
  beforeContent: string;
  borderColor: string;
  borderLeftWidth: string;
  boxShadow: string;
  radius: string;
  transform: string;
}

interface CardSample {
  box: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  className: string;
  state: CardState;
  text: string;
}

const targets: Target[] = [
  {
    name: 'Amazon Hub overview card',
    path: '/amz_hub_overview',
    selector: '.amz-hub-overview .sop-card',
  },
  {
    name: 'SOP overview card',
    path: '/sops_overview',
    selector: '.sops-overview .sop-card[class*="border-l-"]',
  },
  {
    name: 'More overview card',
    path: '/more_overview',
    selector: '.more-overview .sop-card[class*="border-l-"]',
  },
  {
    name: 'App Center workflow card',
    path: '/app-center',
    compareIconAccent: true,
    selector: '.app-flow-step.app-child-link',
  },
  {
    name: 'App Center overview card',
    path: '/app-center',
    compareIconAccent: true,
    selector: '.app-overview-card',
  },
];

function normalizeColor(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractRgb(value: string): [number, number, number, number] | null {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;

  const parts = match[1]
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (parts.length < 3) return null;
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

function colorDistance(a: string, b: string): number {
  const left = extractRgb(a);
  const right = extractRgb(b);

  if (!left || !right) return Number.POSITIVE_INFINITY;

  return Math.sqrt(
    (left[0] - right[0]) ** 2 +
      (left[1] - right[1]) ** 2 +
      (left[2] - right[2]) ** 2,
  );
}

function extractInsetRailColor(boxShadow: string): string | null {
  const shadows = boxShadow.split(/,\s(?=(?:rgb|rgba)\()/);
  const rail = shadows.find((shadow) => shadow.includes('inset') && shadow.includes('4px 0px 0px 0px'));

  if (!rail || rail.includes('rgba(0, 0, 0, 0)')) return null;
  return rail.match(/rgba?\([^)]+\)/)?.[0] ?? null;
}

function isTransparentInsetRail(boxShadow: string): boolean {
  return boxShadow.includes('rgba(0, 0, 0, 0) 4px 0px 0px 0px inset');
}

async function readCard(locator: Locator): Promise<CardSample | null> {
  return locator.evaluate((card) => {
    const rect = card.getBoundingClientRect();
    const styles = getComputedStyle(card);
    const before = getComputedStyle(card, '::before');
    const accentElement = card.querySelector<HTMLElement>('.app-flow-icon, .app-card-icon');
    const accentStyles = getComputedStyle(accentElement ?? card);

    if (
      rect.width <= 40 ||
      rect.height <= 40 ||
      styles.display === 'none' ||
      styles.visibility === 'hidden'
    ) {
      return null;
    }

    return {
      box: {
        height: rect.height,
        width: rect.width,
        x: rect.x,
        y: rect.y,
      },
      className: card.className,
      state: {
        accentReferenceColor: accentStyles.color,
        background: styles.backgroundColor,
        beforeContent: before.content,
        borderColor: styles.borderTopColor,
        borderLeftWidth: styles.borderLeftWidth,
        boxShadow: styles.boxShadow,
        radius: styles.borderTopLeftRadius,
        transform: styles.transform,
      },
      text: (card.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
    };
  });
}

async function readHoverState(page: Page, locator: Locator, base: CardSample): Promise<CardSample | null> {
  let latest: CardSample | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await locator.hover({ force: true, timeout: 5000 });
    await page.waitForTimeout(350);

    latest = await readCard(locator);

    if (
      latest &&
      extractInsetRailColor(latest.state.boxShadow) &&
      normalizeColor(latest.state.borderColor) !== normalizeColor(base.state.borderColor) &&
      normalizeColor(latest.state.background) !== normalizeColor(base.state.background)
    ) {
      return latest;
    }

    await page.mouse.move(1, 1);
    await page.waitForTimeout(100);
  }

  return latest;
}

async function auditTarget(page: Page, target: Target): Promise<string[]> {
  const failures: string[] = [];

  await page.goto(`${hashBase}${target.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page
    .waitForFunction(
      (selector) => {
        return Array.from(document.querySelectorAll<HTMLElement>(selector)).some((element) => {
          const rect = element.getBoundingClientRect();
          const styles = getComputedStyle(element);

          return (
            rect.width > 40 &&
            rect.height > 40 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            styles.display !== 'none' &&
            styles.visibility !== 'hidden'
          );
        });
      },
      target.selector,
      { timeout: 8000 },
    )
    .catch(() => undefined);
  const cards = page.locator(target.selector);
  const count = await cards.count();

  if (count === 0) {
    return [`${target.name}: no visible card found with selector "${target.selector}"`];
  }

  let checkedCount = 0;

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);

    if (!(await card.isVisible())) {
      continue;
    }

    checkedCount += 1;
    await card.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await page.mouse.move(1, 1);
    await page.waitForTimeout(80);

    const base = await readCard(card);

    if (!base) {
      failures.push(`${target.name} #${index + 1}: visible card could not be sampled`);
      continue;
    }

    const hover = await readHoverState(page, card, base);

    if (!hover) {
      failures.push(`${target.name} #${index + 1}: card disappeared after hover`);
      continue;
    }

    const cardLabel = `${target.name} #${index + 1} "${base.text}"`;
    const railColor = extractInsetRailColor(hover.state.boxShadow);

    if (base.state.radius !== '16px') {
      failures.push(`${cardLabel}: expected 16px default radius, got ${base.state.radius}`);
    }

    if (base.state.borderLeftWidth !== '1px') {
      failures.push(`${cardLabel}: expected default left border width 1px, got ${base.state.borderLeftWidth}`);
    }

    if (!isTransparentInsetRail(base.state.boxShadow)) {
      failures.push(`${cardLabel}: expected transparent default inset rail`);
    }

    if (base.state.beforeContent !== 'none') {
      failures.push(`${cardLabel}: expected disabled ::before rail, got ${base.state.beforeContent}`);
    }

    if (hover.state.radius !== '16px') {
      failures.push(`${cardLabel}: expected 16px hover radius, got ${hover.state.radius}`);
    }

    if (!railColor) {
      failures.push(`${cardLabel}: expected visible 4px inset rail on hover`);
    }

    if (normalizeColor(hover.state.borderColor) === normalizeColor(base.state.borderColor)) {
      failures.push(`${cardLabel}: expected hover border color to change`);
    }

    if (normalizeColor(hover.state.background) === normalizeColor(base.state.background)) {
      failures.push(`${cardLabel}: expected hover background to change`);
    }

    if (hover.state.transform !== 'none') {
      failures.push(`${cardLabel}: expected no hover transform, got ${hover.state.transform}`);
    }

    if (railColor && colorDistance(railColor, hover.state.borderColor) > 12) {
      failures.push(
        `${cardLabel}: hover rail color ${railColor} does not match border ${hover.state.borderColor}`,
      );
    }

    if (
      target.compareIconAccent &&
      railColor &&
      hover.state.accentReferenceColor &&
      colorDistance(railColor, hover.state.accentReferenceColor) > 12
    ) {
      failures.push(
        `${cardLabel}: hover rail color ${railColor} does not match card accent ${hover.state.accentReferenceColor}`,
      );
    }
  }

  if (checkedCount === 0) {
    failures.push(`${target.name}: no visible cards could be checked with selector "${target.selector}"`);
  }

  return failures;
}

async function main(): Promise<void> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const failures: string[] = [];

    for (const target of targets) {
      failures.push(...(await auditTarget(page, target)));
    }

    if (failures.length > 0) {
      console.error('Card UI audit failed:');
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`Card UI audit passed for ${targets.length} PC overview card targets.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Card UI audit could not run.');
    console.error(`Base URL: ${baseUrl}`);
    console.error('Start the local dev server first, for example: npm run dev:simple');
    console.error(message);
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
}

void main();
