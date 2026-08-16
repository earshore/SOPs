/**
 * PC workbench panel UI audit.
 *
 * Workbench panels are dense tools, not overview navigation cards. They should
 * use restrained hover feedback and must not inherit the overview left rail.
 */

import { readFileSync } from 'node:fs';
import { chromium, type Browser, type Locator, type Page } from 'playwright';
import { launchPreviewServer } from './_preview-server';

const baseUrl = process.env.CARD_AUDIT_BASE_URL || 'http://127.0.0.1:5175';
const hashBase = `${baseUrl.replace(/\/$/, '')}/#`;

interface RuntimeTarget {
  expectedMinVisible: number;
  maxRadiusPx: number;
  name: string;
  path: string;
  readyText: string;
  selector: string;
}

interface PanelState {
  background: string;
  beforeContent: string;
  boxShadow: string;
  color: string;
  radius: string;
  transform: string;
}

const scraperStylePath = 'src/modules/app_center/views/master_analysis/scraper/scraper_style.css';

const sourceTransformSelectors = [
  '.card-elevated:hover',
  '.task-card:hover',
  '.history-card:hover',
  '.plugin-card:hover',
  '.strategy-card:hover',
];

const runtimeTargets: RuntimeTarget[] = [
  {
    expectedMinVisible: 2,
    maxRadiusPx: 8,
    name: 'Keyword Hunter input workbench panels',
    path: '/app-center/keyword-hunter/input',
    readyText: '关键词与 Listing 文案输入',
    selector: '.keyword-hunter-input-card',
  },
  {
    expectedMinVisible: 2,
    maxRadiusPx: 8,
    name: 'Keyword Hunter process workbench panels',
    path: '/app-center/keyword-hunter/process',
    readyText: 'SEO 处理中心',
    selector: '.keyword-hunter-surface-card',
  },
  {
    expectedMinVisible: 1,
    maxRadiusPx: 8,
    name: 'Keyword Hunter analysis workbench panels',
    path: '/app-center/keyword-hunter/analysis',
    readyText: 'AI 评审报告',
    selector: '.keyword-hunter-surface-card',
  },
  {
    expectedMinVisible: 3,
    maxRadiusPx: 8,
    name: 'Scraper elevated workbench panels',
    path: '/app-center/master-analysis/scraper',
    readyText: '数据采集',
    selector: '.card-elevated',
  },
  {
    expectedMinVisible: 2,
    maxRadiusPx: 8,
    name: 'Scraper strategy workbench panels',
    path: '/app-center/master-analysis/scraper',
    readyText: '数据采集',
    selector: '.strategy-card',
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSelectorBlocks(source: string, selector: string): string[] {
  const pattern = new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, 'g');
  return Array.from(source.matchAll(pattern), match => match[1] ?? '');
}

function auditScraperSource(): string[] {
  const failures: string[] = [];
  const source = readFileSync(scraperStylePath, 'utf8');

  for (const selector of sourceTransformSelectors) {
    const blocks = findSelectorBlocks(source, selector);

    if (blocks.length === 0) {
      failures.push(`${scraperStylePath}: missing ${selector} workbench hover rule`);
      continue;
    }

    for (const block of blocks) {
      const transform = block.match(/\btransform\s*:\s*([^;]+);/);

      if (transform && transform[1]?.trim() !== 'none') {
        failures.push(
          `${scraperStylePath}: ${selector} must not move layout, found transform: ${transform[1].trim()}`
        );
      }
    }
  }

  if (/\.history-card::before\s*\{[^}]*content\s*:\s*['"]{2}/s.test(source)) {
    failures.push(
      `${scraperStylePath}: .history-card::before must not draw a decorative hover rail`
    );
  }

  return failures;
}

function parsePixelValue(value: string): number {
  const parsed = Number(value.replace('px', ''));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function hasOverviewRailShadow(boxShadow: string): boolean {
  return boxShadow.includes('inset') && boxShadow.includes('2px 0px 0px 0px');
}

type AuditMode = 'light' | 'dark';

/** 深色背景必须显著低于浅色背景的亮度差（实际差距 ≥ 0.5，0.3 留足容差）。 */
const DARK_LUMINANCE_DROP = 0.3;

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
function auditDarkFlip(label: string, light: PanelState, dark: PanelState): string[] {
  const failures: string[] = [];

  if (dark.background === light.background) {
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

  const lightTextLuminance = luminance(light.color);
  const darkTextLuminance = luminance(dark.color);

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

async function readPanel(locator: Locator): Promise<PanelState | null> {
  return locator.evaluate(panel => {
    const rect = panel.getBoundingClientRect();
    const styles = getComputedStyle(panel);
    const before = getComputedStyle(panel, '::before');

    if (
      rect.width <= 40 ||
      rect.height <= 40 ||
      styles.display === 'none' ||
      styles.visibility === 'hidden'
    ) {
      return null;
    }

    return {
      background: styles.backgroundColor,
      beforeContent: before.content,
      boxShadow: styles.boxShadow,
      color: styles.color,
      radius: styles.borderTopLeftRadius,
      transform: styles.transform,
    };
  });
}

async function auditRuntimeTarget(
  page: Page,
  target: RuntimeTarget,
  mode: AuditMode,
  lightSamples: Map<string, PanelState[]>
): Promise<string[]> {
  const failures: string[] = [];

  await page.goto(`${hashBase}${target.path}`, { waitUntil: 'commit', timeout: 30000 });
  if (mode === 'dark') {
    await enableDarkMode(page);
  }
  await page.waitForFunction(
    ({ readyText, selector }) => {
      if (!document.body.textContent?.includes(readyText)) {
        return false;
      }

      return Array.from(document.querySelectorAll<HTMLElement>(selector)).some(element => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);

        return (
          rect.width > 40 &&
          rect.height > 40 &&
          styles.display !== 'none' &&
          styles.visibility !== 'hidden'
        );
      });
    },
    { readyText: target.readyText, selector: target.selector },
    { timeout: 40000 }
  );

  const panels = page.locator(target.selector);
  const count = await panels.count();
  let visibleCount = 0;

  for (let index = 0; index < count; index += 1) {
    const panel = panels.nth(index);

    if (!(await panel.isVisible())) {
      continue;
    }

    visibleCount += 1;
    await panel.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await page.mouse.move(1, 1);
    await page.waitForTimeout(120);

    const base = await readPanel(panel);

    if (!base) {
      failures.push(`${target.name} #${index + 1}: visible panel could not be sampled`);
      continue;
    }

    if (mode === 'light') {
      const samples = lightSamples.get(target.name) ?? [];
      samples[index] = base;
      lightSamples.set(target.name, samples);
    } else {
      const lightBase = lightSamples.get(target.name)?.[index];
      if (lightBase) {
        failures.push(...auditDarkFlip(`${target.name} #${index + 1}`, lightBase, base));
      }
    }

    await panel.hover({ force: true, timeout: 5000 });
    await page.waitForTimeout(220);
    const hover = await readPanel(panel);

    if (!hover) {
      failures.push(`${target.name} #${index + 1}: panel disappeared after hover`);
      continue;
    }

    if (parsePixelValue(base.radius) > target.maxRadiusPx) {
      failures.push(
        `${target.name} #${index + 1}: expected <=${target.maxRadiusPx}px radius, got ${base.radius}`
      );
    }

    if (hover.transform !== 'none') {
      failures.push(
        `${target.name} #${index + 1}: expected no hover transform, got ${hover.transform}`
      );
    }

    if (hasOverviewRailShadow(hover.boxShadow)) {
      failures.push(`${target.name} #${index + 1}: must not inherit overview inset rail shadow`);
    }

    if (hover.beforeContent !== 'none' && target.selector === '.history-card') {
      failures.push(
        `${target.name} #${index + 1}: history workbench panel must not draw a hover rail`
      );
    }
  }

  if (visibleCount < target.expectedMinVisible) {
    failures.push(
      `${target.name}: expected at least ${target.expectedMinVisible} visible panels, got ${visibleCount}`
    );
  }

  return prefixModeFailures(failures, mode);
}

async function main(): Promise<void> {
  const server = await launchPreviewServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const failures = [...auditScraperSource()];
    const lightSamples = new Map<string, PanelState[]>();

    for (const target of runtimeTargets) {
      failures.push(...(await auditRuntimeTarget(page, target, 'light', lightSamples)));
    }

    for (const target of runtimeTargets) {
      failures.push(...(await auditRuntimeTarget(page, target, 'dark', lightSamples)));
    }

    if (failures.length > 0) {
      console.error('Workbench UI audit failed:');
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      `Workbench UI audit passed for ${runtimeTargets.length} PC workbench targets (light + dark).`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Workbench UI audit could not run.');
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
