import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readTemplate = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

function readTemplateFragment(path: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = readTemplate(path);
  return template.content;
}

function querySelectorDeep(root: ParentNode, selector: string): Element | null {
  const element = root.querySelector(selector);
  if (element) {
    return element;
  }

  for (const template of Array.from(root.querySelectorAll('template'))) {
    const nested = querySelectorDeep(template.content, selector);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function requireElement(root: ParentNode, selector: string): Element {
  const element = querySelectorDeep(root, selector);
  expect(element, selector).not.toBeNull();
  return element as Element;
}

function normalizeText(node: Node): string {
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('UI-P1-08 template semantics', () => {
  it('keeps AI Analysis progress and settings controls announced', () => {
    const root = readTemplateFragment(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html'
    );

    requireElement(root, '[role="status"][aria-live="polite"][aria-atomic="true"]');

    const progressbar = requireElement(
      root,
      '[role="progressbar"][aria-labelledby="ai-analysis-progress-label"]'
    );
    expect(progressbar.getAttribute(':aria-valuenow')).toBe('progressAriaValue');

    const schedulingGroup = requireElement(
      root,
      '[role="radiogroup"][aria-labelledby="ai-analysis-scheduling-title"]'
    );
    expect(schedulingGroup.getAttribute('aria-describedby')).toBe(
      'ai-analysis-scheduling-helper'
    );
    requireElement(root, '[aria-describedby="ai-analysis-cache-helper"]');
  });

  it('keeps AI Analysis missing-data notice visually aligned with PromptLab report notice', () => {
    const path = 'src/modules/app_center/views/master_analysis/ai_analysis/template.html';
    const html = readTemplate(path);
    const root = readTemplateFragment(path);
    const notice = requireElement(root, '.rounded-xl.border.border-amber-200.bg-amber-50.p-4');

    expect(normalizeText(notice)).toContain('还没有可分析的产品数据');
    expect(normalizeText(notice)).toContain(
      '可以先去数据采集页导入 JSON 或采集 ASIN，再回到这里选择产品和分析目标。'
    );
    expect(html).toContain('font-bold text-amber-900 flex items-center gap-2 text-sm');
    expect(html).toContain('text-xs text-amber-800/80 mt-1');
    expect(html).toContain('px-4 py-2 rounded-xl bg-amber-600');
    expect(html).toContain('fa-solid fa-spider mr-1');
  });

  it('connects PromptLab Product DNA fields to visible labels and helper sources', () => {
    const root = readTemplateFragment(
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
      requireElement(root, `#${id}-label`);
      const control = requireElement(root, `[aria-labelledby="${id}-label"]`);
      expect(control.getAttribute('aria-describedby')).toBe(`${id}-source`);
      requireElement(root, `#${id}-source`);
    });

    const status = requireElement(root, '#lab-analysis-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
  });

  it('keeps report empty states task-oriented on PC workflows', () => {
    const promptlabRoot = readTemplateFragment(
      'src/modules/app_center/views/master_analysis/promptlab/template.html'
    );
    const keywordAnalysisRoot = readTemplateFragment(
      'src/modules/app_center/views/keyword_hunter/analysis/template.html'
    );

    const reportSections = requireElement(promptlabRoot, '#report-sections-container');
    const promptlabEmpty = requireElement(reportSections, '[role="status"][aria-live="polite"]');
    expect(normalizeText(promptlabEmpty)).toContain('还没有报告维度');
    expect(normalizeText(promptlabEmpty)).toContain('推荐操作：');
    expect(normalizeText(promptlabEmpty)).toContain('一键导入的维度');

    const keywordEmpty = requireElement(keywordAnalysisRoot, '#kt-analysis-empty-state');
    expect(normalizeText(keywordEmpty)).toContain('还没有评审报告');
    expect(normalizeText(keywordEmpty)).toContain('推荐操作：');
    expect(normalizeText(keywordEmpty)).toContain('Top 3 改写建议');
  });

  it('keeps Keyword Hunter translation progress and input fields programmatically described', () => {
    const processRoot = readTemplateFragment(
      'src/modules/app_center/views/keyword_hunter/process/template.html'
    );
    const inputRoot = readTemplateFragment(
      'src/modules/app_center/views/keyword_hunter/input/template.html'
    );

    const progress = requireElement(processRoot, '#kt-translate-progress');
    expect(progress.getAttribute('role')).toBe('progressbar');
    requireElement(processRoot, '#kt-translate-status[role="status"][aria-live="polite"]');
    requireElement(processRoot, '[aria-describedby="kt-translate-status"]');

    requireElement(inputRoot, '[aria-labelledby="kt-keywords-input-label"]');
    const keywordsInput = requireElement(inputRoot, '[aria-labelledby="kt-keywords-input-label"]');
    expect(keywordsInput.getAttribute('aria-describedby')).toContain('kt-keywords-input-helper');
    requireElement(inputRoot, '[aria-labelledby="kt-copy-input-label"]');
    requireElement(
      inputRoot,
      '#kt-input-draft-status[role="status"][aria-live="polite"][aria-atomic="true"]'
    );
  });
});
