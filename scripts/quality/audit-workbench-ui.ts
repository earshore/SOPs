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
  beforeContent: string;
  boxShadow: string;
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
      beforeContent: before.content,
      boxShadow: styles.boxShadow,
      radius: styles.borderTopLeftRadius,
      transform: styles.transform,
    };
  });
}

async function auditRuntimeTarget(page: Page, target: RuntimeTarget): Promise<string[]> {
  const failures: string[] = [];

  await page.goto(`${hashBase}${target.path}`, { waitUntil: 'commit', timeout: 30000 });
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

  return failures;
}

async function main(): Promise<void> {
  const server = await launchPreviewServer();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const failures = [...auditScraperSource()];

    for (const target of runtimeTargets) {
      failures.push(...(await auditRuntimeTarget(page, target)));
    }

    if (failures.length > 0) {
      console.error('Workbench UI audit failed:');
      for (const failure of failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`Workbench UI audit passed for ${runtimeTargets.length} PC workbench targets.`);
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
