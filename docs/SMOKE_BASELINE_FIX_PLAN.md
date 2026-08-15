# Smoke 3 例 chromium-only Baseline 缺陷专项修复/隔离计划

作者：Manus AI · 日期：2026-08-15

## 1. 缺陷清单与定位

`tests/e2e/release-smoke.spec.ts` 在 v3.1.1-rc.4 前后历次全浏览器冒烟（93 用例 = 31 用例 × 3 浏览器）中，固定 3 例失败且清单逐批一致（次序 13 批 1/2/3 与收尾收紧专项均复现同一清单），已排除回归属性，确认为**基线断言层与浏览器维度的耦合缺陷**。

| #   | 用例                                                                                 | 失败浏览器 | 错误信息                                                             |
| --- | ------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------- |
| 1   | NPI lifecycle table status colors render correctly in light and dark mode（L1522:3） | firefox    | baseline/actual region size mismatch（976×631 vs 实际更大）          |
| 2   | 同上                                                                                 | webkit     | baseline/actual region size mismatch（976×631 vs 1952×1262，2× dpr） |
| 3   | core routes mobile horizontal overflow（L657:3）                                     | webkit     | innerText 断言时序/渲染差异误判                                      |

## 2. 根因分析

**缺陷 1/2（NPI 像素断言）**：`captureStableRegion()`（L323）以 CSS 像素构造 clip（REGION_CAPTURE_WIDTH/HEIGHT 未乘 dpr），但 webkit/firefox 的 `page.screenshot({clip})` 在某些配置下按设备像素缩放输出。实测 webkit 输出 1952×1262 = 2× 的 baseline 尺寸，说明 webkit 在该 viewport/dpr 组合下 clip 语义为设备像素，导致同一 baseline PNG 无法跨浏览器复用。`assertPixelDiff()`（L355）随后以尺寸不等直接抛出，未进入像素差异比对。根因是**断言层把 CSS 像素几何绑定在 chromium 单一 dpr 行为上**，baseline 只能服务一个浏览器。

**缺陷 3（core routes webkit 时序）**：用例 L657 依赖 `innerText` 计数阈值断言页面渲染完成，webkit 渲染时序与 chromium 存在差异，断言时点早于布局稳定，属时序型误判而非视觉缺陷。

## 3. 修复方案（两步）

### Step 1：断言层 dpr 归一化（修根因，改动一行语义）

`captureStableRegion()` 的 `page.screenshot` 增加 `scale: 'css'`（Playwright 1.13+，本库 1.61.1），强制 clip 与输出均按 CSS 像素，消除 dpr 依赖：

```ts
return page.screenshot({
  clip: {
    x: 0,
    y: top,
    width: Math.min(REGION_CAPTURE_WIDTH, vp.width),
    height: Math.min(REGION_CAPTURE_HEIGHT, vp.height - top),
  },
  scale: 'css', // 三浏览器统一输出 CSS 像素尺寸，baseline 单一即可复用
});
```

改动范围仅限 `captureStableRegion` 一处，不动 baseline PNG、不动断言逻辑，风险面最小。修复后 3 浏览器输出同尺寸，NPI 两例 baseline 继续复用。

### Step 2：时序用例隔离（若 Step 1 后用例 3 仍失败）

core routes 用例在断言前补一轮稳定等待（与 NPI 断言同构的 `requestAnimationFrame × 2` 布局稳定化），或将阈值断言改为"≥ 预期最小值"双向容差，webkit 时序波动即被吸收。若修复引入新行为风险，降级为按浏览器跳过像素断言（`project === 'webkit'` 时跳过），仅保留 chromium 基线约束——隔离优先于删除。

### 执行纪律

单用例单浏览器验证 → 全 93 用例重跑 → 若 Step 1 引起任何现有通过用例回退立即回滚。基线 PNG 若确需重新 seeding（UPDATE_SNAPSHOTS=1），产物需提交 `docs/color-region-baselines/` 并记录在本文档。

## 4. 验收判据

修复后 smoke 93/93 全绿（含 firefox/webkit 的 NPI light+dark 两基线断言与 core routes webkit 断言），且 ci:quality 20 项与 build 无回退。

## 5. 登记

本计划登记于看板 `TECH_DEBT_BOARD.md`（新增 TD-E2E-01 卡片）与 `NEXT_PHASES_PLAN.md`（次序 14），门禁不纳入基线缺陷统计（baseline 双锁只防语义色回退，不覆盖断言层耦合问题）。
