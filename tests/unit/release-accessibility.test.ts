import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

const aiAnalysis = read(
  'src/modules/app_center/views/master_analysis/ai_analysis/template.html'
);
const promptlab = read('src/modules/app_center/views/master_analysis/promptlab/template.html');
const scraper = read('src/modules/app_center/views/master_analysis/scraper/template.html');
const headerCss = read('src/css/components/header-main.css');

function firstHeadingLevelAfterH1(html: string): number | undefined {
  const afterH1 = html.slice(html.indexOf('</h1>') + '</h1>'.length);
  const match = afterH1.match(/<h([2-6])\b/i);
  return match ? Number(match[1]) : undefined;
}

describe('release accessibility contract', () => {
  it.each([
    ['AI Analysis', aiAnalysis],
    ['PromptLab', promptlab],
  ])('%s starts its secondary heading hierarchy at h2', (_label, html) => {
    expect(firstHeadingLevelAfterH1(html)).toBe(2);
  });

  it('derives the Scraper empty-state button name from its visible content', () => {
    const button = scraper.match(
      /<button\b[^>]*\bid="no-data-msg"[^>]*>[\s\S]*?<\/button>/
    )?.[0];

    if (!button) {
      throw new Error('Expected a complete button with id="no-data-msg"');
    }

    expect(button).toContain('还没有产品数据');
    expect(button).not.toMatch(/\baria-label\s*=/);
    expect(button).not.toMatch(/\baria-labelledby\s*=/);
    expect(button.match(/\baria-describedby\s*=/g) ?? []).toHaveLength(1);
    expect(button).toMatch(/\baria-describedby\s*=\s*"scraper-import-status"/);
    expect(scraper).toContain('id="scraper-import-status"');
  });

  it('makes the Scraper history scroller a named keyboard-focusable region', () => {
    const region =
      scraper.match(/<div[^>]*aria-label="历史快照列表"[^>]*>/)?.[0] ||
      scraper.match(/<div[^>]*class="[^"]*max-h-\[min\(60vh,28rem\)\][^"]*"[^>]*>/)?.[0];

    expect(region).toBeTruthy();
    expect(region).toContain('role="region"');
    expect(region).toContain('aria-label="历史快照列表"');
    expect(region).toContain('tabindex="0"');
  });

  it('uses the stronger primary token for the active top navigation item', () => {
    expect(headerCss).toMatch(
      /\.nav-trigger\[aria-current='page'\]\s*{\s*color:\s*var\(--color-primary-darker/
    );
  });

  it('keeps dark nav hierarchy: idle muted, active/open brightest', () => {
    expect(headerCss).toContain('--header-nav-idle: var(--color-slate-400, #94a3b8);');
    expect(headerCss).toContain('--header-nav-active: var(--color-slate-50, #f8fafc);');

    const activeRule = headerCss.match(
      /\.dark \.nav-trigger\[aria-current='page'\],[\s\S]*?\[data-theme='dark'\] \.nav-trigger\[aria-current='page'\]\s*{[^}]*}/
    )?.[0];
    expect(activeRule).toBeTruthy();
    expect(activeRule).toContain('var(--header-nav-active');
    expect(activeRule).not.toContain('--color-primary-light');
    expect(activeRule).not.toMatch(/color:\s*var\(--color-primary-darker/);

    expect(headerCss).toContain('border-left-color: color-mix(in srgb, #fff 8%, transparent);');
    expect(headerCss).toContain('.dark .version-card.tip-card');
    expect(headerCss).toContain('var(--surface-card, #1e293b) 92%');
    expect(headerCss).toContain('.dark .quick-access-item:hover');
    expect(headerCss).toContain('var(--color-primary, #818cf8) 18%');
  });

  it('keeps the PromptLab missing-report notice one level below its card heading', () => {
    expect(promptlab).toMatch(/<h3[^>]*>[\s\S]*?未检测到 AI 分析报告[\s\S]*?<\/h3>/);
  });
});
