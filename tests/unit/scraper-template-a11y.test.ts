import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const template = readFileSync(
  'src/modules/app_center/views/master_analysis/scraper/template.html',
  'utf8'
);
const renderers = readFileSync(
  'src/modules/app_center/views/master_analysis/scraper/utils/renderers.ts',
  'utf8'
);

describe('Scraper template accessibility semantics', () => {
  it('keeps import triggers keyboard reachable and names the hidden file input', () => {
    const emptyStateButton = template.match(
      /<button\b[^>]*\bid="no-data-msg"[^>]*>/
    )?.[0];
    const hiddenFileInput = template.match(
      /<input\b[^>]*\bid="import-file-input"[^>]*>/
    )?.[0];

    if (!emptyStateButton) {
      throw new Error('Expected an opening button tag with id="no-data-msg"');
    }
    if (!hiddenFileInput) {
      throw new Error('Expected an opening input tag with id="import-file-input"');
    }

    expect(template.match(/data-scraper-import-trigger/g)).toHaveLength(1);
    expect(template.match(/data-scraper-merge-trigger/g)).toHaveLength(1);
    expect(template.match(/data-scraper-overwrite-trigger/g)).toHaveLength(1);
    expect(template).not.toContain('@click="triggerImport()"');
    expect(hiddenFileInput).toContain('aria-label="导入 JSON 产品数据文件"');
    expect(template).toContain('aria-label="合并导入 JSON 产品数据文件"');
    expect(template).toContain('aria-label="合并导入 JSON 产品数据文件"');
    expect(template).toContain('aria-label="导入新的 JSON 产品数据文件"');
    expect(template).toContain('id="overwrite-file-input"');
    expect(template).toContain("handleImportFiles($event, 'merge')");
    // 导入新的：模板必须绑定 'new' 模式（存档现有数据 + 确认弹窗）；禁旧 'overwrite' 值
    expect(template).toContain("handleImportFiles($event, 'new')");
    expect(template).not.toContain("handleImportFiles($event, 'overwrite')");
    // Focus ring is Appearance-tokenized (theme Phase 1–2), not hard blue.
    expect(template).toContain(
      'focus-visible:ring-2 focus-visible:ring-[var(--color-primary,var(--color-primary))]'
    );
    expect(emptyStateButton).not.toContain('role="button"');
    expect(emptyStateButton).not.toContain('tabindex="0"');
    expect(emptyStateButton).not.toContain('@keydown.enter.prevent="triggerImport()"');
    expect(emptyStateButton).not.toContain('@keydown.space.prevent="triggerImport()"');
    expect(template).toContain('id="scraper-import-status"');
    expect(emptyStateButton).toContain('aria-describedby="scraper-import-status"');
    expect(template).toContain('aria-describedby="scraper-merge-help scraper-import-status"');
    expect(template).toContain('aria-describedby="scraper-overwrite-help scraper-import-status"');
    expect(template).toContain(':role="importStatusRole"');
    expect(template).toContain(':aria-live="importStatusLive"');
    expect(hiddenFileInput).toContain('aria-describedby="scraper-import-status"');
  });

  it('names Alpine-driven manual scrape controls', () => {
    expect(template).toContain(':aria-label="\'选择目标站点 \' + getSiteUrl(site)"');
    expect(template).toContain('@click="clearAsins()"');
    expect(template).toContain(':aria-label="scrapingButtonText"');
    expect(template).toContain(':disabled="startDisabled"');
  });

  it('keeps Scraper buttons explicit about non-submit behavior', () => {
    const source = `${template}\n${renderers}`;
    const buttonOpenings = source.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      button => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    expect(implicitButtons).toEqual([]);
  });

  it('associates ASIN input helpers and exposes scrape progress semantics', () => {
    expect(template).toContain('aria-describedby="scraper-asin-helper scraper-asin-status"');
    expect(template).toContain('id="scraper-asin-status"');
    expect(template).toContain('role="status"');
    expect(template).toContain('aria-live="polite"');
    expect(template).toContain('role="progressbar"');
    expect(template).toContain(':aria-valuenow="completedTaskCount"');
    expect(template).toContain(':aria-valuemax="tasks.length"');
  });

  it('exposes review toggle and history errors with semantic state', () => {
    expect(template).toContain('role="switch"');
    expect(template).toContain(':aria-checked="scrapeReviews"');
    expect(template).toContain('aria-labelledby="scraper-reviews-toggle-label"');
    expect(template).toContain('aria-describedby="scraper-reviews-toggle-help"');
    expect(template).toContain(":class=\"historyLoadError ? '' : 'hidden'\"");
    expect(template).toContain('role="alert"');
    expect(template).toContain('aria-live="assertive"');
  });

  it('keeps import and history empty states task-oriented', () => {
    const normalizedTemplate = template.replace(/\s+/g, ' ');

    expect(template).toContain('还没有产品数据');
    expect(normalizedTemplate).toContain(
      '推荐操作：点击导入 JSON 文件，或在下方输入 ASIN 开始采集。'
    );
    expect(template).toContain('还没有历史快照');
    expect(template).toContain('当前还没有可恢复的采集快照');
    expect(template).toContain('快照会记录站点、ASIN 数量和最近采集时间。');
  });
});
