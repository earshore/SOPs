/**
 * Structural gate: enterprise constitution files exist, are marked SSOT/active,
 * and INDEX + release template wire the required surfaces.
 * Proves documentation landing (docs-only SSOT stack) is present in-repo.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(rel: string): string {
  const p = resolve(root, rel);
  expect(existsSync(p), `missing constitution file: ${rel}`).toBe(true);
  return readFileSync(p, 'utf8');
}

/** Active constitutions required by the enterprise guidelines landing plan */
const CONSTITUTIONS: { path: string; mustInclude: string[] }[] = [
  { path: 'docs/PRODUCT_PRINCIPLES.md', mustInclude: ['Status:', 'active', 'Definition of Done'] },
  { path: 'docs/CONTENT_DESIGN.md', mustInclude: ['Status:', 'active', '去 AI 味'] },
  { path: 'docs/ACCESSIBILITY.md', mustInclude: ['Status:', 'active', 'focus-visible'] },
  { path: 'docs/THEME_SYSTEM_GUIDELINES.md', mustInclude: ['主题'] },
  { path: 'docs/VISUAL_DESIGN_GUIDELINES.md', mustInclude: ['视觉'] },
  { path: 'docs/COMPONENT_GUIDELINES.md', mustInclude: ['Status:', 'active', 'action-btn'] },
  { path: 'docs/MODAL_DEVELOPMENT_GUIDELINES.md', mustInclude: ['confirmWithModal'] },
  { path: 'docs/TESTING_STRATEGY.md', mustInclude: ['Status:', 'active', '风险'] },
  { path: 'docs/OPS_RUNBOOK.md', mustInclude: ['Status:', 'active', '回滚'] },
  { path: 'docs/SECURITY_PLAYBOOK.md', mustInclude: ['Status:', 'active', '威胁模型', '验收清单'] },
  { path: 'docs/TECH_DEBT_BOARD.md', mustInclude: ['Open', 'Closed'] },
  { path: 'docs/RELEASE_POLICY.md', mustInclude: ['Pre-release'] },
  { path: 'docs/DEPLOYMENT.md', mustInclude: ['Cloudflare'] },
];

describe('enterprise guidelines SSOT stack', () => {
  it('every active constitution file exists with required markers', () => {
    for (const { path, mustInclude } of CONSTITUTIONS) {
      const body = read(path);
      for (const token of mustInclude) {
        expect(body, `${path} should contain "${token}"`).toContain(token);
      }
    }
  });

  it('INDEX decision tree links every constitution and security playbook', () => {
    const index = read('docs/INDEX.md');
    expect(index).toContain('30 秒决策树');
    const requiredLinks = [
      'PRODUCT_PRINCIPLES.md',
      'CONTENT_DESIGN.md',
      'ACCESSIBILITY.md',
      'THEME_SYSTEM_GUIDELINES.md',
      'VISUAL_DESIGN_GUIDELINES.md',
      'COMPONENT_GUIDELINES.md',
      'MODAL_DEVELOPMENT_GUIDELINES.md',
      'TESTING_STRATEGY.md',
      'OPS_RUNBOOK.md',
      'SECURITY_PLAYBOOK.md',
      'TECH_DEBT_BOARD.md',
      'RELEASE_POLICY.md',
      'DEPLOYMENT.md',
      'SECURITY.md',
    ];
    for (const link of requiredLinks) {
      expect(index, `INDEX should reference ${link}`).toContain(link);
    }
  });

  it('root README points to docs/INDEX.md as sole doc entry', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/docs\/INDEX\.md/);
    expect(readme).toMatch(/文档唯一入口|INDEX\.md/);
  });

  it('SECURITY.md links to SECURITY_PLAYBOOK', () => {
    const sec = read('SECURITY.md');
    expect(sec).toContain('SECURITY_PLAYBOOK.md');
  });

  it('TECH_DEBT_BOARD has no dual-truth: TD-OPS-01 only in Closed', () => {
    const board = read('docs/TECH_DEBT_BOARD.md');
    const openIdx = board.indexOf('## Open');
    const closedIdx = board.indexOf('## Closed');
    expect(openIdx).toBeGreaterThan(-1);
    expect(closedIdx).toBeGreaterThan(openIdx);
    const openSection = board.slice(openIdx, closedIdx);
    const closedSection = board.slice(closedIdx);
    expect(openSection).not.toMatch(/\*\*TD-OPS-01\*\*/);
    expect(closedSection).toMatch(/TD-OPS-01/);
    // Delivered doc-stack marker present in Closed
    expect(closedSection).toMatch(/TD-DOC-STACK|TD-DOC-02/);
  });

  it('release notes template embeds OPS smoke and a11y checklists explicitly', () => {
    const tpl = read('docs/templates/RELEASE_NOTES_TEMPLATE.md');
    expect(tpl).toContain('发版后冒烟（OPS');
    expect(tpl).toContain('系统设置可打开');
    expect(tpl).toContain('无障碍发版抽检');
    expect(tpl).toContain('focus-visible');
    expect(tpl).toMatch(/OPS_RUNBOOK/);
    expect(tpl).toMatch(/ACCESSIBILITY/);
  });

  it('superpowers README requires constitution-touch checklist', () => {
    const sp = read('docs/superpowers/README.md');
    expect(sp).toContain('Constitution-touch checklist');
    expect(sp).toContain('PRODUCT_PRINCIPLES');
    expect(sp).toContain('SECURITY_PLAYBOOK');
    expect(sp).toContain('TESTING_STRATEGY');
  });

  it('SECURITY_PLAYBOOK covers threat model surfaces for BYOK static site', () => {
    const pb = read('docs/SECURITY_PLAYBOOK.md');
    expect(pb).toMatch(/localStorage|IndexedDB|本机/);
    expect(pb).toMatch(/XSS/);
    expect(pb).toMatch(/导出|备份/);
    expect(pb).toMatch(/BYOK|自备/);
    // Explicit non-scope (not inventing multi-tenant product)
    expect(pb).toMatch(/不[\s\S]{0,40}覆盖[\s\S]{0,80}多租户|不做[\s\S]{0,40}多用户|多租户登录/);
  });
});
