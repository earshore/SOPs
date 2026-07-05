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
    expect(template).toContain('id="no-data-msg"');
    expect(template).toContain('type="button"\n            @click="triggerImport()"');
    expect(template).toContain('aria-label="导入 JSON 产品数据文件"');
    expect(template).toContain('aria-label="重新导入 JSON 产品数据文件"');
    expect(template).toContain('focus-visible:ring-2 focus-visible:ring-blue-500');
    expect(template).not.toContain('role="button"');
    expect(template).not.toContain('tabindex="0"');
    expect(template).not.toContain('@keydown.enter.prevent="triggerImport()"');
    expect(template).not.toContain('@keydown.space.prevent="triggerImport()"');
    expect(template).toContain('id="scraper-import-status"');
    expect(template).toContain('aria-describedby="scraper-import-help scraper-import-status"');
    expect(template).toContain('aria-describedby="scraper-reimport-help scraper-import-status"');
    expect(template).toContain(':role="importStatusRole"');
    expect(template).toContain(':aria-live="importStatusLive"');
    expect(template).toContain('aria-describedby="scraper-import-status"');
  });

  it('names Alpine-driven manual scrape controls', () => {
    expect(template).toContain('type="button"\n                      @click="clearAsins()"');
    expect(template).toContain('type="button"\n                      :aria-label="scrapingButtonText"');
    expect(template).toContain(':disabled="startDisabled"');
  });

  it('keeps Scraper buttons explicit about non-submit behavior', () => {
    const source = `${template}\n${renderers}`;
    const buttonOpenings = source.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      (button) => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
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
    expect(template).toContain('x-show="historyLoadError"');
    expect(template).toContain('role="alert"');
    expect(template).toContain('aria-live="assertive"');
  });

  it('keeps import and history empty states task-oriented', () => {
    expect(template).toContain('还没有产品数据');
    expect(template).toContain('推荐操作：点击导入 JSON 文件，或在下方输入 ASIN 开始采集。');
    expect(template).toContain('还没有历史快照');
    expect(template).toContain('当前还没有可恢复的采集快照');
    expect(template).toContain('快照会记录站点、ASIN 数量和最近采集时间。');
  });
});
