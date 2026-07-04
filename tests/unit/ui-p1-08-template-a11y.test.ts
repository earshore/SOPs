import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readTemplate = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('UI-P1-08 template semantics', () => {
  it('keeps AI Analysis progress and settings controls announced', () => {
    const html = readTemplate(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html'
    );

    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain(':aria-valuenow="progressAriaValue"');
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="ai-analysis-scheduling-title"');
    expect(html).toContain('aria-describedby="ai-analysis-cache-helper"');
  });

  it('keeps AI Analysis missing-data notice visually aligned with PromptLab report notice', () => {
    const html = readTemplate(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html'
    );

    expect(html).toContain('还没有可分析的产品数据');
    expect(html).toContain(
      '可以先去数据采集页导入 JSON 或采集 ASIN，再回到这里选择产品和分析目标。'
    );
    expect(html).toContain('rounded-xl border border-amber-200 bg-amber-50 p-4');
    expect(html).toContain('font-bold text-amber-900 flex items-center gap-2 text-sm');
    expect(html).toContain('text-xs text-amber-800/80 mt-1');
    expect(html).toContain('px-4 py-2 rounded-xl bg-amber-600');
    expect(html).toContain('fa-solid fa-spider mr-1');
  });

  it('connects PromptLab Product DNA fields to visible labels and helper sources', () => {
    const html = readTemplate(
      'src/modules/app_center/views/master_analysis/promptlab/template.html'
    );

    [
      'lab-keywords-tier1',
      'negative-keywords',
      'lab-keywords-tier2',
      'lab-audience',
      'lab-usps',
      'lab-specs',
    ].forEach(id => {
      expect(html).toContain(`id="${id}-label"`);
      expect(html).toContain(`aria-labelledby="${id}-label"`);
      expect(html).toContain(`aria-describedby="${id}-source"`);
      expect(html).toContain(`id="${id}-source"`);
    });

    expect(html).toContain(
      'id="lab-analysis-status" role="status" aria-live="polite" aria-atomic="true"'
    );
  });

  it('keeps Keyword Hunter translation progress and input fields programmatically described', () => {
    const processHtml = readTemplate(
      'src/modules/app_center/views/keyword_hunter/process/template.html'
    );
    const inputHtml = readTemplate('src/modules/app_center/views/keyword_hunter/input/template.html');

    expect(processHtml).toContain('id="kt-translate-progress"');
    expect(processHtml).toContain('role="progressbar"');
    expect(processHtml).toContain('id="kt-translate-status"');
    expect(processHtml).toContain('aria-describedby="kt-translate-status"');

    expect(inputHtml).toContain('aria-labelledby="kt-keywords-input-label"');
    expect(inputHtml).toContain('aria-describedby="kt-keywords-input-helper');
    expect(inputHtml).toContain('aria-labelledby="kt-copy-input-label"');
    expect(inputHtml).toContain('role="status" aria-live="polite" aria-atomic="true"');
  });
});
