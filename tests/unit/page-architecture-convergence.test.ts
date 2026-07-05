import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';

const modulesDir = join(cwd(), 'src/modules');

const nakedMountAllowlist = [
  'src/modules/app_center/views/keyword_hunter/analysis/index.ts',
  'src/modules/app_center/views/keyword_hunter/input/index.ts',
  'src/modules/app_center/views/keyword_hunter/process/index.ts',
  'src/modules/app_center/views/master_analysis/ai_analysis/index.ts',
  'src/modules/app_center/views/master_analysis/promptlab/index.ts',
  'src/modules/app_center/views/master_analysis/scraper/index.ts',
  'src/modules/sops/views/growth/npi_tracker/index.ts',
];

const viewLoaderAllowlist = [
  'src/modules/app_center/views/playground/deep-chat/controller.ts',
  'src/modules/app_center/views/ppc_tools/ppc_search_terms/index.ts',
  'src/modules/home/homeDisplay.ts',
];

const rawTemplateAllowlist = [
  'src/modules/amz_hub/views/advanced/conversion_optimization/index.ts',
  'src/modules/amz_hub/views/advanced/mature_phase/index.ts',
  'src/modules/amz_hub/views/advanced/new_product_30days/index.ts',
  'src/modules/amz_hub/views/knowledge/ecosystem/index.ts',
  'src/modules/amz_hub/views/knowledge/eu_insights/index.ts',
  'src/modules/amz_hub/views/knowledge/seo_strategy/index.ts',
  'src/modules/amz_hub/views/overview/index.ts',
  'src/modules/amz_hub/views/practice/marketing_calendar/index.ts',
  'src/modules/amz_hub/views/practice/promo_activities/index.ts',
  'src/modules/amz_hub/views/practice/promo_tools/index.ts',
  'src/modules/amz_hub/views/practice/quality_listing/index.ts',
  'src/modules/app_center/views/master_analysis/promptlab/index.ts',
];

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectFiles(fullPath, files);
      continue;
    }

    if (/\.(ts|html)$/.test(entry) && !/\.(test|spec)\.ts$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function findOffenders(pattern: RegExp, extensions: readonly string[] = ['.ts']): string[] {
  return collectFiles(modulesDir)
    .filter(file => extensions.some(extension => file.endsWith(extension)))
    .filter(file => pattern.test(readFileSync(file, 'utf8')))
    .map(file => normalizePath(relative(cwd(), file)))
    .sort();
}

describe('page architecture convergence', () => {
  it('does not add new naked mount page entries', () => {
    const offenders = findOffenders(/\bexport\s+(?:async\s+)?function\s+mount\b/);

    expect(offenders).toEqual(nakedMountAllowlist);
  });

  it('does not add new viewLoader usage in production modules', () => {
    const offenders = findOffenders(/\bviewLoader\b|common\/utils\/viewLoader/);

    expect(offenders).toEqual(viewLoaderAllowlist);
  });

  it('does not add new raw template imports in production modules', () => {
    const offenders = findOffenders(/template\.html\?raw|html\?raw|templateHTML/);

    expect(offenders).toEqual(rawTemplateAllowlist);
  });

  it('keeps high-risk automation copy behind human-confirmation wording', () => {
    const offenders = findOffenders(/每日自动更新|实时同步|最后自动执行/, ['.ts', '.html']);

    expect(offenders).toEqual([]);
  });
});
