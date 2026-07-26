/**
 * Structural gate: enterprise constitution files exist, are marked SSOT/active,
 * and INDEX + release + debt surfaces wire without dual-truth residual risk.
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

/** IDs like TD-OPS-01, TD-DOC-STACK, TD-SET-DENSITY */
const TD_ID = /TD-[A-Z]+(?:-[A-Z0-9]+)*/g;

/**
 * Extract debt IDs from a markdown table body between heading markers.
 * Uses first-column cells (pipe tables) to avoid prose noise.
 */
function tableIdsBetween(body: string, startHeading: string, endHeading?: string): Set<string> {
  const start = body.indexOf(startHeading);
  expect(start, `missing heading ${startHeading}`).toBeGreaterThan(-1);
  const end =
    endHeading !== undefined
      ? body.indexOf(endHeading, start + startHeading.length)
      : body.length;
  expect(end, `missing end heading ${endHeading ?? '(eof)'}`).toBeGreaterThan(start);
  const slice = body.slice(start, end);
  const ids = new Set<string>();
  for (const line of slice.split('\n')) {
    const m = line.match(/^\|\s*\*?\*?(TD-[A-Z]+(?:-[A-Z0-9]+)*)\*?\*?\s*\|/);
    if (m) ids.add(m[1]);
  }
  return ids;
}

/** Active constitutions required by the enterprise guidelines landing plan */
const CONSTITUTIONS: { path: string; mustInclude: string[] }[] = [
  { path: 'docs/PRODUCT_PRINCIPLES.md', mustInclude: ['Status:', 'active', 'Definition of Done'] },
  { path: 'docs/CONTENT_DESIGN.md', mustInclude: ['Status:', 'active', '去 AI 味'] },
  { path: 'docs/ACCESSIBILITY.md', mustInclude: ['Status:', 'active', 'focus-visible'] },
  { path: 'docs/THEME_SYSTEM_GUIDELINES.md', mustInclude: ['Status:', 'active', '主题'] },
  { path: 'docs/VISUAL_DESIGN_GUIDELINES.md', mustInclude: ['Status:', 'active', '视觉'] },
  { path: 'docs/COMPONENT_GUIDELINES.md', mustInclude: ['Status:', 'active', 'action-btn'] },
  { path: 'docs/MODAL_DEVELOPMENT_GUIDELINES.md', mustInclude: ['Status:', 'active', 'confirmWithModal'] },
  { path: 'docs/TESTING_STRATEGY.md', mustInclude: ['Status:', 'active', '风险'] },
  { path: 'docs/OPS_RUNBOOK.md', mustInclude: ['Status:', 'active', '回滚'] },
  { path: 'docs/SECURITY_PLAYBOOK.md', mustInclude: ['Status:', 'active', '威胁模型', '验收清单'] },
  { path: 'docs/TECH_DEBT_BOARD.md', mustInclude: ['Open', 'Closed'] },
  { path: 'docs/RELEASE_POLICY.md', mustInclude: ['Status:', 'active', 'Pre-release'] },
  { path: 'docs/DEPLOYMENT.md', mustInclude: ['Status:', 'active', 'Cloudflare'] },
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
    // Historical demotion arrows (no dual authority for strategy/debt)
    expect(index).toMatch(/TECH_DEBT_AUDIT[\s\S]{0,80}勿当 open|历史快照/);
    expect(index).toMatch(/TEST_GUIDE[\s\S]{0,80}TESTING_STRATEGY|策略以 TESTING_STRATEGY/);
  });

  it('root README points to docs/INDEX.md as sole doc entry', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/docs\/INDEX\.md/);
    expect(readme).toMatch(/文档唯一入口|INDEX\.md/);
  });

  it('GETTING_STARTED and PRODUCT wire INDEX + SECURITY_PLAYBOOK', () => {
    const gs = read('docs/GETTING_STARTED.md');
    expect(gs).toMatch(/INDEX\.md/);
    const product = read('docs/PRODUCT_PRINCIPLES.md');
    expect(product).toContain('SECURITY_PLAYBOOK.md');
    expect(product).toContain('TECH_DEBT_BOARD.md');
    expect(product).toMatch(/Definition of Done|功能交付/);
  });

  it('SECURITY.md links to SECURITY_PLAYBOOK', () => {
    const sec = read('SECURITY.md');
    expect(sec).toContain('SECURITY_PLAYBOOK.md');
  });

  it('TECH_DEBT_BOARD has zero dual-truth between Open and Closed tables', () => {
    const board = read('docs/TECH_DEBT_BOARD.md');
    // Theme cross-index must sit before Closed so scanners don't treat open IDs as closed
    const themeIdx = board.indexOf('## 主题债交叉索引');
    const closedIdx = board.indexOf('## Closed');
    expect(themeIdx).toBeGreaterThan(-1);
    expect(closedIdx).toBeGreaterThan(themeIdx);

    const openIds = tableIdsBetween(board, '## Open', '## 主题债交叉索引');
    const closedIds = tableIdsBetween(board, '## Closed');
    expect(openIds.size, 'Open table should list real remaining debt').toBeGreaterThan(0);
    expect(closedIds.has('TD-OPS-01')).toBe(true);
    expect(closedIds.has('TD-DOC-STACK') || closedIds.has('TD-DOC-02')).toBe(true);
    expect(openIds.has('TD-OPS-01')).toBe(false);

    const dual = [...openIds].filter((id) => closedIds.has(id));
    expect(dual, `IDs in both Open and Closed tables: ${dual.join(', ')}`).toEqual([]);

    // Residual open theme debt must remain in Open (not only cross-index prose)
    expect(openIds.has('TD-THM-01')).toBe(true);
    expect(openIds.has('TD-THM-02')).toBe(true);
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

  it('RELEASE_POLICY human acceptance includes OPS + a11y checkboxes', () => {
    const pol = read('docs/RELEASE_POLICY.md');
    expect(pol).toMatch(/OPS.*冒烟|发版冒烟/);
    expect(pol).toMatch(/A11y|无障碍|键盘抽检/);
    expect(pol).toMatch(/OPS_RUNBOOK/);
    expect(pol).toMatch(/ACCESSIBILITY/);
  });

  it('superpowers README requires constitution-touch checklist', () => {
    const sp = read('docs/superpowers/README.md');
    expect(sp).toContain('Constitution-touch checklist');
    expect(sp).toContain('PRODUCT_PRINCIPLES');
    expect(sp).toContain('SECURITY_PLAYBOOK');
    expect(sp).toContain('TESTING_STRATEGY');
    expect(sp).toContain('TECH_DEBT_BOARD');
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

  it('OPS and a11y anchors referenced by release path exist as headings', () => {
    const ops = read('docs/OPS_RUNBOOK.md');
    expect(ops).toMatch(/## 4\.\s*发版后冒烟/);
    const a11y = read('docs/ACCESSIBILITY.md');
    expect(a11y).toMatch(/## 3\.\s*关键路径抽检清单/);
  });

  it('historical debt pointers demote AUDIT; living board is open SSOT', () => {
    const archive = read('docs/archive/quality/README.md');
    expect(archive).toContain('TECH_DEBT_BOARD.md');
    expect(archive).toMatch(/历史快照|勿当|禁止/);
    // Must not claim AUDIT alone is current open truth
    expect(archive).not.toMatch(/当前状态以\s*\[?技术债务审计报告/);

    const gates = read('docs/CI-QUALITY-GATES.md');
    expect(gates).toContain('TECH_DEBT_BOARD.md');
    expect(gates).toMatch(/活|open 债/);
    expect(gates).toMatch(/TECH_DEBT_AUDIT[\s\S]{0,60}历史|勿当 open/);
  });

  it('no broken relative links on core SSOT entry surfaces', () => {
    const surfaces = [
      'docs/INDEX.md',
      'docs/PRODUCT_PRINCIPLES.md',
      'docs/SECURITY_PLAYBOOK.md',
      'docs/TECH_DEBT_BOARD.md',
      'docs/templates/RELEASE_NOTES_TEMPLATE.md',
      'docs/RELEASE_POLICY.md',
      'docs/superpowers/README.md',
      'SECURITY.md',
      'README.md',
    ];
    const linkRe = /\[[^\]]*]\(([^)]+)\)/g;
    const broken: string[] = [];
    for (const rel of surfaces) {
      const body = read(rel);
      const dir = resolve(root, rel, '..');
      let m: RegExpExecArray | null;
      linkRe.lastIndex = 0;
      while ((m = linkRe.exec(body)) !== null) {
        const href = m[1];
        if (/^(https?:|mailto:|#)/i.test(href)) continue;
        const pathPart = href.split('#')[0];
        if (!pathPart) continue;
        const target = resolve(dir, pathPart);
        if (!existsSync(target)) broken.push(`${rel} -> ${href}`);
      }
    }
    expect(broken, broken.join('\n')).toEqual([]);
  });

  // Prevent accidental reintroduction of dual-truth via free-form TD mentions in Closed table only
  it('Closed section table does not re-list Open IDs (full ID set check)', () => {
    const board = read('docs/TECH_DEBT_BOARD.md');
    const openStart = board.indexOf('## Open');
    const themeStart = board.indexOf('## 主题债交叉索引');
    const closedStart = board.indexOf('## Closed');
    const openSlice = board.slice(openStart, themeStart > -1 ? themeStart : closedStart);
    const closedSlice = board.slice(closedStart);
    // Closed table ends at next ## or eof — strip post-table prose for safety
    const closedTableEnd = closedSlice.search(/\n## /);
    const closedTable =
      closedTableEnd > -1 ? closedSlice.slice(0, closedTableEnd) : closedSlice;

    const openIds = new Set(openSlice.match(TD_ID) ?? []);
    const closedTableIds = new Set(
      [...closedTable.matchAll(/^\|\s*\*?\*?(TD-[A-Z]+(?:-[A-Z0-9]+)*)\*?\*?\s*\|/gm)].map(
        (x) => x[1]
      )
    );
    const dual = [...openIds].filter((id) => closedTableIds.has(id));
    expect(dual).toEqual([]);
  });
});
