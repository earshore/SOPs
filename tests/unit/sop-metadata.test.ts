import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';

const sopsViewsDir = join(cwd(), 'src/modules/sops/views');
const requiredMetadataLabels = ['作业元信息', 'Owner', '更新时间', '适用站点', '输入', '输出', '人工确认点'];
const manualConfirmationPattern = /必须.{0,12}(确认|复核|执行)/;
const copyOutputActionPattern = /data-action="[^"]*copy[^"]*Template"/i;
const toolBackedOutputs: Record<string, string> = {
  'growth/ppc_advertising/template.html': 'data-tab="ppc_search_terms"',
};

function findTemplateFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return findTemplateFiles(fullPath);
    }

    return entry === 'template.html' ? [fullPath] : [];
  });
}

describe('SOP metadata guard', () => {
  it('keeps every real SOP page tied to owner, inputs, outputs, and human confirmation', () => {
    const templates = findTemplateFiles(sopsViewsDir)
      .filter((file) => !relative(sopsViewsDir, file).startsWith('overview'));

    expect(templates.length).toBeGreaterThan(0);

    const missing = templates.flatMap((file) => {
      const html = readFileSync(file, 'utf8');
      return requiredMetadataLabels
        .filter((label) => !html.includes(label))
        .map((label) => `${relative(sopsViewsDir, file)} missing ${label}`);
    });

    expect(missing).toEqual([]);
  });

  it('keeps every real SOP page explicit about mandatory human confirmation', () => {
    const templates = findTemplateFiles(sopsViewsDir)
      .filter((file) => !relative(sopsViewsDir, file).startsWith('overview'));

    const missingBoundary = templates
      .filter((file) => {
        const html = readFileSync(file, 'utf8');
        const metadataIndex = html.indexOf('人工确认点');
        const metadataSnippet = metadataIndex >= 0 ? html.slice(metadataIndex, metadataIndex + 260) : '';
        return !manualConfirmationPattern.test(metadataSnippet);
      })
      .map((file) => `${relative(sopsViewsDir, file)} missing mandatory human confirmation wording`);

    expect(missingBoundary).toEqual([]);
  });

  it('keeps every real SOP page tied to a reusable output or tool output route', () => {
    const templates = findTemplateFiles(sopsViewsDir)
      .filter((file) => !relative(sopsViewsDir, file).startsWith('overview'));

    const missingOutput = templates
      .filter((file) => {
        const html = readFileSync(file, 'utf8');
        if (copyOutputActionPattern.test(html)) return false;

        const normalizedPath = relative(sopsViewsDir, file).replace(/\\/g, '/');
        const requiredToolRoute = toolBackedOutputs[normalizedPath];
        return !requiredToolRoute || !html.includes(requiredToolRoute);
      })
      .map((file) => `${relative(sopsViewsDir, file)} missing reusable output action`);

    expect(missingOutput).toEqual([]);
  });
});
