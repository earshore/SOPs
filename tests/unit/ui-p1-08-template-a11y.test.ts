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

function findImplicitButtons(html: string): string[] {
  const buttonOpenings = html.match(/<button\b[^>]*>/g) ?? [];
  return buttonOpenings.filter(button => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button));
}

describe('UI-P1-08 template semantics', () => {
  it('keeps AI Analysis progress and settings controls announced', () => {
    const path = 'src/modules/app_center/views/master_analysis/ai_analysis/template.html';
    const html = readTemplate(path);
    const root = readTemplateFragment(path);

    requireElement(root, '[role="status"][aria-live="polite"][aria-atomic="true"]');
    expect(html).not.toContain(':style=');
    expect(html).not.toContain('x-bind:style=');

    const progressbar = requireElement(
      root,
      '[role="progressbar"][aria-labelledby="ai-analysis-progress-label"]'
    );
    expect(progressbar.getAttribute(':aria-valuenow')).toBe('progressAriaValue');

    const schedulingGroup = requireElement(
      root,
      '[role="radiogroup"][aria-labelledby="ai-analysis-scheduling-title"]'
    );
    expect(schedulingGroup.getAttribute('aria-describedby')).toBe('ai-analysis-scheduling-helper');
    requireElement(root, '[aria-describedby="ai-analysis-cache-helper"]');
  });

  it('keeps AI Analysis dynamic selection and JSON buttons named', () => {
    const html = readTemplate(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html'
    );

    expect(html).toContain(':aria-label="target.name +');
    expect(html).toContain(':aria-pressed="selectedTargets.includes(target.id).toString()"');
    expect(html).toContain(':class="getListingTargetCardClass(target.id)"');
    expect(html).toContain(':class="getReviewTargetCardClass(target.id)"');
    expect(html).toContain(
      ":aria-label=\"showJsonViewer ? '收起 JSON 格式报告' : '展开 JSON 格式报告'\""
    );
    expect(html).toContain(':aria-expanded="showJsonViewer.toString()"');
  });

  it('keeps AI Analysis buttons explicit about non-submit behavior', () => {
    const html = readTemplate(
      'src/modules/app_center/views/master_analysis/ai_analysis/template.html'
    );
    const buttonOpenings = html.match(/<button\b[^>]*>/g) ?? [];
    const implicitButtons = buttonOpenings.filter(
      button => !/\btype\s*=|:type\s*=|x-bind:type\s*=/.test(button)
    );

    expect(buttonOpenings).toHaveLength(27);
    expect(implicitButtons).toEqual([]);
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

  it('keeps AI Analysis product-data empty states task-oriented', () => {
    const path = 'src/modules/app_center/views/master_analysis/ai_analysis/template.html';
    const html = readTemplate(path);
    const root = readTemplateFragment(path);

    expect(normalizeText(root)).toContain('还没有产品数据');
    expect(html).toContain('推荐操作：先从"数据采集"模块抓取产品数据');
    expect(html).toContain("hasNoAnalysisData ? '还没有产品数据' : '准备开始智能分析'");
    expect(html).toContain('推荐操作：先完成数据采集或导入');
    expect(html).toContain('数据准备完成后，这里会展示可导出的 AI 分析报告。');
    expect(html).toContain('focus-visible:ring-amber-500');
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

    const keywordEmpty = requireElement(
      keywordAnalysisRoot,
      '#keyword-hunter-analysis-empty-state'
    );
    expect(normalizeText(keywordEmpty)).toContain('还没有评审报告');
    expect(normalizeText(keywordEmpty)).toContain('推荐操作：');
    expect(normalizeText(keywordEmpty)).toContain('Top 3 改写建议');
  });

  it('keeps Keyword Hunter analysis buttons explicit about non-submit behavior', () => {
    const html = readTemplate('src/modules/app_center/views/keyword_hunter/analysis/template.html');
    const buttons = html.match(/<button\b[^>]*>/g) ?? [];

    expect(buttons).toHaveLength(1);
    expect(findImplicitButtons(html)).toEqual([]);
  });

  it('keeps Keyword Hunter translation progress and input fields programmatically described', () => {
    const processRoot = readTemplateFragment(
      'src/modules/app_center/views/keyword_hunter/process/template.html'
    );
    const inputRoot = readTemplateFragment(
      'src/modules/app_center/views/keyword_hunter/input/template.html'
    );

    const progress = requireElement(processRoot, '#keyword-hunter-translate-progress');
    expect(progress.getAttribute('role')).toBe('progressbar');
    requireElement(processRoot, 'label[for="keyword-hunter-translation-model-select"]');
    requireElement(
      processRoot,
      '#keyword-hunter-translation-model-select[aria-describedby="keyword-hunter-translation-model-status"]'
    );
    requireElement(
      processRoot,
      '#keyword-hunter-refresh-models-btn[aria-label="重新获取 AI 翻译可用模型"]'
    );
    requireElement(
      processRoot,
      '#keyword-hunter-translation-model-status[role="status"][aria-live="polite"][aria-atomic="true"]'
    );
    requireElement(
      processRoot,
      '#keyword-hunter-translate-status[role="status"][aria-live="polite"]'
    );
    requireElement(processRoot, '[aria-describedby="keyword-hunter-translate-status"]');

    requireElement(inputRoot, '[aria-labelledby="keyword-hunter-keywords-input-label"]');
    const keywordsInput = requireElement(
      inputRoot,
      '[aria-labelledby="keyword-hunter-keywords-input-label"]'
    );
    expect(keywordsInput.getAttribute('aria-describedby')).toContain(
      'keyword-hunter-keywords-input-helper'
    );
    requireElement(inputRoot, '[aria-labelledby="keyword-hunter-copy-input-label"]');
    requireElement(
      inputRoot,
      '#keyword-hunter-input-draft-status[role="status"][aria-live="polite"][aria-atomic="true"]'
    );
    const startAnalysisButton = requireElement(inputRoot, '#keyword-hunter-btn-start-analysis');
    expect(startAnalysisButton.classList.contains('keyword-hunter-title-action-btn')).toBe(true);
    expect(normalizeText(startAnalysisButton)).toContain('开始分析');
    const snapshotEmpty = requireElement(
      inputRoot,
      '#keyword-hunter-input-snapshot-empty[role="status"][aria-live="polite"]'
    );
    expect(normalizeText(snapshotEmpty)).toContain('还没有历史快照');
    expect(normalizeText(snapshotEmpty)).toContain('推荐操作：');

    const wordFrequencyEmpty = requireElement(
      processRoot,
      '#keyword-hunter-word-frequency-list [role="status"][aria-live="polite"]'
    );
    expect(normalizeText(wordFrequencyEmpty)).toContain('还没有词频数据');
    expect(normalizeText(wordFrequencyEmpty)).toContain('推荐操作：');
  });
});
