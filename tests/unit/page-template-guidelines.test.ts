import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const guidePath = join(cwd(), 'docs/guides/modules/page-implementation-templates.md');

function readGuide(): string {
  return readFileSync(guidePath, 'utf8');
}

describe('page implementation template guidelines', () => {
  it('keeps the required page category templates documented', () => {
    const guide = readGuide();

    [
      '工具类页面',
      '页面知识类',
      'SOP 作业流',
      '看板/追踪类',
      '模块总览页',
      '自动化/场景示例',
    ].forEach(category => {
      expect(guide).toContain(`| ${category} |`);
    });
  });

  it('keeps the implementation skeleton aligned with architecture convergence rules', () => {
    const guide = readGuide();

    [
      'module.manifest.ts',
      "import.meta.glob('./views/**/index.ts')",
      'buildModuleMapFromLoaderPaths()',
      'BaseModule',
      'await this.getLogger()',
      'SafeTemplateLoader',
      'ModuleLoader',
      '不要把 `SafeModuleLoader.loadModule()` 接入新页面主链路',
      '不要新增 CSS registry 或运行时 CSS loader',
    ].forEach(rule => {
      expect(guide).toContain(rule);
    });
  });

  it('keeps the new page checklist tied to reviewable behaviors', () => {
    const guide = readGuide();

    [
      '工具类页面覆盖 loading、error、empty、success 四类状态',
      '知识类和 SOP 页面写清楚适用范围、人工核对点和维护口径',
      '没有同步使用 `this.logger`、`this.http` 或 `container.resolve',
      '没有新增 CSS registry、运行时 CSS loader 或全局散落样式',
      '不写“每日自动更新”“实时同步”等生产化承诺',
    ].forEach(check => {
      expect(guide).toContain(check);
    });
  });
});
