#!/usr/bin/env node
/**
 * T5 主题正交矩阵契约检查（Theme × Accent × Ownership）。
 *
 * 计算样式断言（非快照）——验证三轴互不踩踏：
 *   1. Theme 拥有中性面: surface/text 只随 mode 变，不随 accent 变
 *   2. Accent 拥有 primary: --color-primary 只随 accent 变，不随 mode 变
 *   3. Ownership 色相: 模块 banner (wb-theme-*) 类名与 accent/mode 无关
 *   4. resolved 标记链完整: data-color-mode / -resolved / .dark / color-scheme
 *
 * Usage: node scripts/test/theme-matrix-check.mjs [baseURL]
 *   (default http://localhost:4273 — vite preview)
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:4273';
const MODES = ['light', 'dark'];
const ACCENTS = ['default', 'minimal', 'ocean'];

/** KH input 页带 rose ownership banner（release-smoke 同源断言点） */
const OWNERSHIP_ROUTE = '#/app-center/keyword-hunter/input';
const OWNERSHIP_CLASS = 'wb-theme-rose';

const failures = [];
const matrix = {};

const browser = await chromium.launch();

for (const mode of MODES) {
  for (const accent of ACCENTS) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(
      ([m, a]) => {
        localStorage.setItem('app-color-mode', JSON.stringify(m));
        localStorage.setItem('app-theme', JSON.stringify(a));
      },
      [mode, accent]
    );
    await page.goto(`${BASE}/${OWNERSHIP_ROUTE}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1200);

    const probe = await page.evaluate(cls => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      return {
        colorMode: root.dataset.colorMode,
        resolved: root.dataset.colorModeResolved,
        darkClass: root.classList.contains('dark'),
        colorScheme: root.style.colorScheme,
        appearance: root.dataset.appearance ?? 'default',
        primary: style.getPropertyValue('--color-primary').trim(),
        surfaceCard: style.getPropertyValue('--surface-card').trim(),
        textPrimary: style.getPropertyValue('--color-text-primary').trim(),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        ownershipPresent: Boolean(document.querySelector(`.${cls}`)),
      };
    }, OWNERSHIP_CLASS);

    matrix[`${mode}|${accent}`] = probe;
    console.log(`[${mode} × ${accent}]`, JSON.stringify(probe));

    // 4) resolved 标记链
    if (probe.resolved !== mode) failures.push(`${mode}×${accent}: resolved=${probe.resolved}`);
    if (probe.darkClass !== (mode === 'dark'))
      failures.push(`${mode}×${accent}: .dark class mismatch`);
    if (probe.colorScheme !== mode)
      failures.push(`${mode}×${accent}: color-scheme=${probe.colorScheme}`);

    await ctx.close();
  }
}

await browser.close();

// 1) Theme 拥有中性面: 同 mode 下三种 accent 的 surface/text/bodyBg 必须一致
for (const mode of MODES) {
  const base = matrix[`${mode}|default`];
  for (const accent of ACCENTS.slice(1)) {
    const cur = matrix[`${mode}|${accent}`];
    for (const key of ['surfaceCard', 'textPrimary', 'bodyBg']) {
      if (cur[key] !== base[key]) {
        failures.push(
          `Accent 踩 Theme 面: ${mode}×${accent} ${key}=${cur[key]} ≠ default 的 ${base[key]}`
        );
      }
    }
  }
}

// 2) Accent 拥有 primary: 同 accent 下两种 mode 的 primary 必须一致；不同 accent 必须不同
for (const accent of ACCENTS) {
  const light = matrix[`light|${accent}`];
  const dark = matrix[`dark|${accent}`];
  if (light.primary !== dark.primary) {
    failures.push(
      `Theme 踩 Accent primary: ${accent} light=${light.primary} dark=${dark.primary}`
    );
  }
}
if (matrix['light|default'].primary === matrix['light|minimal'].primary) {
  failures.push('Accent 轴失效: default 与 minimal 的 primary 相同');
}

// 3) Ownership: 六格全部保留 rose banner 类
for (const key of Object.keys(matrix)) {
  if (!matrix[key].ownershipPresent) {
    failures.push(`Ownership 丢失: ${key} 缺少 .${OWNERSHIP_CLASS}`);
  }
}

if (failures.length) {
  console.error('\n❌ 主题矩阵契约失败:');
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`\n✅ 主题矩阵契约通过 (${MODES.length}×${ACCENTS.length} = 6 格)。`);
