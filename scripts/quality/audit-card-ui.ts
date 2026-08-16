/**
 * PC card UI audit.
 *
 * This gate checks overview navigation cards and selected card-like source
 * contracts. Static callouts and dense workbench panels have different visual
 * standards.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Locator, type Page } from 'playwright';
import { launchPreviewServer } from './_preview-server';

const baseUrl = process.env.CARD_AUDIT_BASE_URL || 'http://127.0.0.1:5175';
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
  textColor: string;
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
    path: '/amz-hub',
    selector: '.amz-hub-overview .sop-card.overview-accent-card',
  },
  {
    name: 'SOP overview card',
    path: '/sops',
    selector: '.sops-overview .sop-card.overview-accent-card',
  },
  {
    name: 'More overview card',
    path: '/more',
    selector: '.more-overview .sop-card.overview-accent-card',
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

const overviewSourcePaths = [
  'src/modules/sops/views/overview/template.html',
  'src/modules/amz_hub/views/overview/template.html',
  'src/modules/more/views/overview/template.html',
  'src/common/components/OverviewRenderer.ts',
];

const keywordStatusSourcePath = 'src/modules/app_center/views/keyword_hunter/process/index.ts';
const sourceRoot = 'src';
const sourceExtensions = new Set(['.css', '.html', '.js', '.jsx', '.ts', '.tsx', '.vue']);
const hoverRailShadowSignature = '2px 0px 0px 0px';

function normalizeColor(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractRgb(value: string): [number, number, number, number] | null {
  const legacy = value.match(/rgba?\(([^)]+)\)/);

  if (legacy) {
    const parts = legacy[1]
      .split(',')
      .map(part => Number(part.trim()))
      .filter(part => Number.isFinite(part));

    if (parts.length < 3) return null;
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
  }

  // Chromium 对 color-mix 等现代语法的计算值序列化为 color(srgb r g b[/ a])，分量为 0-1 浮点。
  const modern = value.match(/color\(srgb\s+([^)]+)\)/);
  if (!modern) return null;

  const parts = modern[1]
    .replace('/', ' ')
    .trim()
    .split(/\s+/)
    .map(part => Number(part))
    .filter(part => Number.isFinite(part));

  if (parts.length < 3) return null;
  const scale = parts.every(part => part <= 1) ? 255 : 1;

  return [parts[0] * scale, parts[1] * scale, parts[2] * scale, parts[3] ?? 1];
}

function colorDistance(a: string, b: string): number {
  const left = extractRgb(a);
  const right = extractRgb(b);

  if (!left || !right) return Number.POSITIVE_INFINITY;

  return Math.sqrt(
    (left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2 + (left[2] - right[2]) ** 2
  );
}

function extractInsetRailColor(boxShadow: string): string | null {
  const shadows = boxShadow.split(/,\s(?=(?:rgb|rgba)\()/);
  const rail = shadows.find(
    shadow => shadow.includes('inset') && shadow.includes(hoverRailShadowSignature)
  );

  if (!rail || rail.includes('rgba(0, 0, 0, 0)')) return null;
  return rail.match(/rgba?\([^)]+\)/)?.[0] ?? null;
}

function hasTransparentInsetRail(boxShadow: string): boolean {
  const shadows = boxShadow.split(/,\s(?=(?:rgb|rgba)\()/);
  const rail = shadows.find(
    shadow => shadow.includes('inset') && shadow.includes(hoverRailShadowSignature)
  );

  return Boolean(rail?.includes('rgba(0, 0, 0, 0)'));
}

type AuditMode = 'light' | 'dark';

/** 深色背景必须显著低于浅色背景的亮度差（实际差距 ≥ 0.5，0.3 留足容差）。 */
const DARK_LUMINANCE_DROP = 0.3;

/** 亮度 0-1：0.2126*R + 0.7152*G + 0.0722*B（不要求 sRGB 线性化）。无法解析或全透明返回 null。 */
function luminance(value: string): number | null {
  const rgb = extractRgb(value);
  if (!rgb || rgb[3] === 0) return null;
  const [red, green, blue] = rgb;
  return 0.2126 * (red / 255) + 0.7152 * (green / 255) + 0.0722 * (blue / 255);
}

/** 注入与 ThemeManager 一致的深色标记（.dark + data-color-mode-resolved + colorScheme）。 */
async function enableDarkMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-color-mode-resolved', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  });
  await page.waitForTimeout(300);
}

function prefixModeFailures(failures: string[], mode: AuditMode): string[] {
  return mode === 'dark' ? failures.map(failure => `[dark] ${failure}`) : failures;
}

/** 深色翻转确实发生：背景变化且显著变暗、文字变亮。不断言具体色值。 */
function auditDarkFlip(label: string, light: CardState, dark: CardState): string[] {
  const failures: string[] = [];

  if (normalizeColor(dark.background) === normalizeColor(light.background)) {
    failures.push(`${label}: expected dark background to differ from light background`);
  }

  const lightLuminance = luminance(light.background);
  const darkLuminance = luminance(dark.background);

  if (
    lightLuminance !== null &&
    darkLuminance !== null &&
    darkLuminance >= lightLuminance - DARK_LUMINANCE_DROP
  ) {
    failures.push(
      `${label}: expected dark background luminance (${darkLuminance.toFixed(3)}) to be significantly below light (${lightLuminance.toFixed(3)})`
    );
  }

  const lightTextLuminance = luminance(light.textColor);
  const darkTextLuminance = luminance(dark.textColor);

  if (
    lightTextLuminance !== null &&
    darkTextLuminance !== null &&
    darkTextLuminance <= lightTextLuminance
  ) {
    failures.push(
      `${label}: expected dark text (${darkTextLuminance.toFixed(3)}) to be lighter than light text (${lightTextLuminance.toFixed(3)})`
    );
  }

  return failures;
}

async function readCard(locator: Locator): Promise<CardSample | null> {
  return locator.evaluate(card => {
    const rect = card.getBoundingClientRect();
    const styles = getComputedStyle(card);
    const before = getComputedStyle(card, '::before');
    const accentElement = card.querySelector<HTMLElement>('.app-flow-icon, .app-card-icon');
    const accentStyles = getComputedStyle(accentElement ?? card);
    // 标题文字色：workflow 卡根色为 accent 且在深色下保持色相，正文标题（h3/strong）才会翻转。
    const textElement = card.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6, strong');
    const textStyles = getComputedStyle(textElement ?? card);

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
        textColor: textStyles.color,
        transform: styles.transform,
      },
      text: (card.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
    };
  });
}

async function readHoverState(
  page: Page,
  locator: Locator,
  base: CardSample
): Promise<CardSample | null> {
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

async function auditTarget(
  page: Page,
  target: Target,
  mode: AuditMode,
  lightSamples: Map<string, CardSample[]>
): Promise<string[]> {
  const failures: string[] = [];

  await page.goto(`${hashBase}${target.path}`, { waitUntil: 'commit', timeout: 30000 });
  if (mode === 'dark') {
    await enableDarkMode(page);
  }
  if (target.selector.includes('app-flow-step')) {
    await page
      .locator('.app-overview-collapsible')
      .evaluate((details: HTMLDetailsElement) => {
        details.open = true;
      })
      .catch(() => undefined);
  }
  await page
    .waitForFunction(
      selector => {
        return Array.from(document.querySelectorAll<HTMLElement>(selector)).some(element => {
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
      { timeout: 8000 }
    )
    .catch(() => undefined);
  const cards = page.locator(target.selector);
  const count = await cards.count();

  if (count === 0) {
    return prefixModeFailures(
      [`${target.name}: no visible card found with selector "${target.selector}"`],
      mode
    );
  }

  let checkedCount = 0;

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);

    if (!(await card.isVisible())) {
      continue;
    }

    checkedCount += 1;
    await card.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await page.mouse.move(1, 1);
    await page.waitForTimeout(250);

    const base = await readCard(card);

    if (!base) {
      failures.push(`${target.name} #${index + 1}: visible card could not be sampled`);
      continue;
    }

    if (mode === 'light') {
      const samples = lightSamples.get(target.name) ?? [];
      samples[index] = base;
      lightSamples.set(target.name, samples);
    }

    const hover = await readHoverState(page, card, base);

    if (!hover) {
      failures.push(`${target.name} #${index + 1}: card disappeared after hover`);
      continue;
    }

    const cardLabel = `${target.name} #${index + 1} "${base.text}"`;
    const railColor = extractInsetRailColor(hover.state.boxShadow);

    if (mode === 'dark') {
      const lightBase = lightSamples.get(target.name)?.[index];
      if (lightBase) {
        failures.push(...auditDarkFlip(cardLabel, lightBase.state, base.state));
      }
    }

    if (base.state.radius !== '16px') {
      failures.push(`${cardLabel}: expected 16px default radius, got ${base.state.radius}`);
    }

    if (base.state.borderLeftWidth !== '1px') {
      failures.push(
        `${cardLabel}: expected default left border width 1px, got ${base.state.borderLeftWidth}`
      );
    }

    if (base.state.beforeContent !== 'none') {
      failures.push(
        `${cardLabel}: expected disabled ::before rail, got ${base.state.beforeContent}`
      );
    }

    // 深色下 .dark .sop-card 会以单条 shadow 覆盖透明 rail 层（CSS 现状），
    // 默认态契约等价为“无可见 rail”；浅色保持透明 rail 层必须存在的严格断言。
    if (mode === 'light') {
      if (!hasTransparentInsetRail(base.state.boxShadow)) {
        failures.push(`${cardLabel}: expected hidden default inset rail`);
      }
    } else if (extractInsetRailColor(base.state.boxShadow)) {
      failures.push(`${cardLabel}: expected hidden default inset rail`);
    }

    if (hover.state.radius !== '16px') {
      failures.push(`${cardLabel}: expected 16px hover radius, got ${hover.state.radius}`);
    }

    if (!railColor) {
      failures.push(`${cardLabel}: expected visible 2px inset rail on hover`);
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
        `${cardLabel}: hover rail color ${railColor} does not match border ${hover.state.borderColor}`
      );
    }

    if (
      target.compareIconAccent &&
      railColor &&
      hover.state.accentReferenceColor &&
      colorDistance(railColor, hover.state.accentReferenceColor) > 12
    ) {
      failures.push(
        `${cardLabel}: hover rail color ${railColor} does not match card accent ${hover.state.accentReferenceColor}`
      );
    }
  }

  if (checkedCount === 0) {
    failures.push(
      `${target.name}: no visible cards could be checked with selector "${target.selector}"`
    );
  }

  return prefixModeFailures(failures, mode);
}

function auditOverviewSources(): string[] {
  const failures: string[] = [];
  const rawBorderLeftPattern = /\bborder-l-(?:\d+|[a-z]+-\d+)\b/g;

  for (const sourcePath of overviewSourcePaths) {
    const source = readFileSync(sourcePath, 'utf8');
    const matches = source.match(rawBorderLeftPattern) ?? [];

    if (matches.length > 0) {
      failures.push(
        `${sourcePath}: overview cards must use overview-accent-* classes, found ${matches.join(', ')}`
      );
    }
  }

  return failures;
}

function auditKeywordStatusSource(): string[] {
  const source = readFileSync(keywordStatusSourcePath, 'utf8');
  const rawBorderLeftPattern = /\bborder-l-(?:\d+|[a-z]+-\d+)\b/;
  const offendingLines = source
    .split(/\r?\n/)
    .filter(line => line.includes('keyword-item') && rawBorderLeftPattern.test(line));

  if (offendingLines.length === 0) {
    return [];
  }

  return [
    `${keywordStatusSourcePath}: keyword status list items must use keyword-status-item classes, found raw border-l-* utilities.`,
  ];
}

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(path));
      continue;
    }

    if (sourceExtensions.has(path.slice(path.lastIndexOf('.')))) {
      files.push(path);
    }
  }

  return files;
}

function auditProjectRawBorderLeftUtilities(): string[] {
  const offenders = collectSourceFiles(sourceRoot).filter(sourcePath => {
    return /\bborder-l-4\b/.test(readFileSync(sourcePath, 'utf8'));
  });

  if (offenders.length === 0) {
    return [];
  }

  return offenders.map(
    sourcePath =>
      `${sourcePath}: raw border-l-4 utility must be replaced with a semantic component class.`
  );
}

async function main(): Promise<void> {
  const server = await launchPreviewServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const failures: string[] = [
      ...auditProjectRawBorderLeftUtilities(),
      ...auditOverviewSources(),
      ...auditKeywordStatusSource(),
    ];
    const lightSamples = new Map<string, CardSample[]>();

    for (const target of targets) {
      failures.push(...(await auditTarget(page, target, 'light', lightSamples)));
    }

    for (const target of targets) {
      failures.push(...(await auditTarget(page, target, 'dark', lightSamples)));
    }

    if (failures.length > 0) {
      console.error('Card UI audit failed:');
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `Card UI audit passed for ${targets.length} PC overview card targets (light + dark).`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Card UI audit could not run.');
    console.error(`Base URL: ${baseUrl}`);
    console.error(
      'Or run with CARD_AUDIT_BASE_URL pointing at a live server (npm run preview / dev:simple).'
    );
    console.error(message);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await server.stop();
  }
}

void main();
