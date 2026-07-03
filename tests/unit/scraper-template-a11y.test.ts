import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const template = readFileSync(
  'src/modules/app_center/views/master_analysis/scraper/template.html',
  'utf8'
);

describe('Scraper template accessibility semantics', () => {
  it('keeps import triggers keyboard reachable and names the hidden file input', () => {
    expect(template).toContain('id="no-data-msg"');
    expect(template).toContain('role="button"');
    expect(template).toContain('tabindex="0"');
    expect(template).toContain('@keydown.enter.prevent="triggerImport()"');
    expect(template).toContain('@keydown.space.prevent="triggerImport()"');
    expect(template).toContain('aria-label="导入 JSON 产品数据文件"');
    expect(template).toContain('id="scraper-import-status"');
    expect(template).toContain('aria-describedby="scraper-import-help scraper-import-status"');
    expect(template).toContain('aria-describedby="scraper-reimport-help scraper-import-status"');
    expect(template).toContain(':role="importStatusRole"');
    expect(template).toContain(':aria-live="importStatusLive"');
    expect(template).toContain('aria-describedby="scraper-import-status"');
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
});
