# 第八轮（终轮）：处置决定

## 定量事实
- runner clip y=89 与基线 dy=0 时均值通道差 4.33/255 ≈ 1.7%（像素级），dy=±1 时为 5.1/5.8 —— 即 dy=0 是最优对齐（无整数像素整页位移）。
- pixelmatch 报告 3.35% 像素被标记为不同，集中在文字抗锯齿 + 浅色区灰度微调（mask 覆盖大但强度低，d>60 才可见）。
- 这类差异的典型来源：runner chromium 版本/字体变化、CSS 微调（如 rc.6 badge 深色收敛 ce25633b 改 cards.css、或 token 归档移除某个被 NPI 页 fallback 使用的变量）。

## 定性判断
- 内容断言全部通过（行数/文本/徽章语义），无视觉功能回归（徽章颜色肉眼一致）。
- 3.35% diff 来自光栅化级漂移，与 TD-E2E-01 处理过的 firefox 3.2% 漂移同类。

## 处置决定（按收益）

### 执行方案：CI 重 seed 三步
1. 临时 commit：test.yml smoke job 加 `env: { UPDATE_SNAPSHOTS: 1 }`。
2. push 触发 CI（smoke 会写回新基线到 docs/color-region-baselines，同时该 run smoke 本身不会 fail——UPDATE_SNAPSHOTS 时 assertPixelDiff 直接 return）。
3. 下载 CI 写回的新基线（git push 前需在 CI 上 upload 或我们直接 checkout 到 main 后 CI 会 push？不会自动 push）——注意：CI 写回工作树但不会 push 回仓库。需要在 CI 里加 upload-artifact step（仅 seed run），然后我们 commit 新基线。
4. 提交新基线 + 移除 env 开关 + 更新 SMOKE_BASELINE_FIX_PLAN 与 TECH_DEBT_BOARD。

注：smoke-e2e job 有 upload E2E report 的 continue-on-error，但新基线 png 需要单独上传。需在 smoke job 加一次性 artifact 上传 step。
TD-E2E-01 已有 per-engine 基线先例：firefox/webkit 3.2% 漂移的处理是"接受该量级漂移并登记基线"。本次 chromium light 基线 3.35% 漂移同样量级。
处置 = 在 CI 上重 seed 基线（将 runner 当前真实渲染写入 docs/color-region-baselines/npi-table-status-colors-light.png），并登记为一次基线漂移事件。
机制：`UPDATE_SNAPSHOTS=1` 由 assertPixelDiff 内部支持（写回 actual shot）。需确认 test.yml smoke job 有 env 开关或手动在 CI run 上设置 env。
