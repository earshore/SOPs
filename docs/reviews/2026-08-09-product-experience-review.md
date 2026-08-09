# 产品体验体检报告：系统设置 × 运营工作台全链路（2026-08-09）

> 身份：产品体验官（实测驱动）。所有"通过项"均以真实点击链路验证，所有"问题项"均附实测数据 + 源码锚点。
> 基线提交：`b881eccf`（HEAD，工作区干净，与 `origin/main` 同步）。探针脚本已全部清理。
> **修复状态（2026-08-09 同日晚些时候）**：P0-1/P0-2/P1/P2/P3 已按用户拍板方案修复并验收（见 `docs/reviews/2026-08-09-p0-p3-fix-spec.md`，提交 `Tighten analysis time estimates and toasts`）。

---

## 一、审查范围与方法

| 项 | 说明 |
|---|---|
| 环境 | 本地 dev server（`scripts/dev/playwright-web-server.js`，`http://localhost:5173`）+ Playwright 注入 |
| LLM 配置 | 注入 `llm_active_provider='new_api'`、`llm_new_api={ endpoint:'https://new.hongecb.store/v1', model:'deepseek-v4-flash', reasoningPrefs:{enabled:true, effort:'max'} }`、`llm_key_new_api=sk-2UAA…WKS`（推理偏好必须放在 `reasoningPrefs` 内，独立 key 不生效——初测三档相同即因此，非 bug） |
| 产品数据 | `examples/product_json/` 下 5 个德语产品 JSON（`Amz_DE_*`，各 8 条评论），文件名带时间戳，按 `startsWith` 匹配 |
| 链路 | 数据采集导入 → AI 智能分析（证据深度=快速）→ Prompt 生成（从报告加载）→ Deep Chat 生成文案 → Keyword Hunter 复核 → Listing 评审（SEO 处理页「开始分析」→「进入分析」） |
| 附加 | 工作台总览（最近作业）、系统设置全分区（导航/LLM/工具策略/网络/数据与备份/外观/开发者诊断）逐项走查 |

---

## 二、结论总览（按收益降序）

| 优先级 | 问题 | 一句话影响 | 关键证据 |
|---|---|---|---|
| **P0-1** | AI 智能分析耗时估算严重失真：快速档 UI「预计 22-36 秒」，实测 **~128 秒**（偏差 3.6x+）；且分析启动后前几十秒无「分析中」状态 | 用户被时间承诺误导，等待期无反馈，体验断裂 | 实测计时 + `analysisTimeEstimator.ts` 静态基准 |
| **P0-2** | Keyword Hunter 评审页硬编码「这可能需要 10 ~ 30 秒」，实测 **60s+** 才出报告 | 同类误导，两处耗时文案口径不一致 | 实测计时 + `analysis/index.ts` L582 |
| **P1** | 分析/设置场景下多项状态提示集中弹出，无优先级、无合并 | 噪音干扰主操作，误以为出错 | toast/状态条采样 + 源码锚点 |
| **P2** | 分析完成态检测不稳定（按钮标签与「分析完成于」双信号源不一致） | 等待脚本/用户无法可靠判断完成 | 多次等待超时 + 模板锚点 |
| **P3** | 「网络」分区深链 `settings-section-network` 归入**工具策略组**（语义混组） | 用户按「网络」找不到分区 | `settingsDeepLink.ts` + `settingsSearch.ts` |
| 通过 | 导入双模式、证据深度真联动、报告加载 DNA、Deep Chat 无思考前言、Keyword Hunter 64/100、最近作业、设置 5 组导航 | — | 详见第八节 |

---

## 三、P0-1：AI 智能分析耗时估算严重失真 + 加载态前置缺失

### 3.1 实测证据（快速档，单次完整链路）

- UI 承诺：证据深度=快速 时显示 **「预计 22-36 秒」**（页面下拉选项 + 开始分析 toast 同源）。
- 实测：点击「开始分析」→ **t≈128s 才进入完成状态**（120s 探测窗口内未命中完成）。
- 偏差倍数：**128 / 29 ≈ 4.4x**（对区间中值）；对下限 22s 达 **5.8x**。
- 附加观察：分析发起后**前几十秒**按钮无「分析中」反馈（loading 态未前置到点击时刻）。

### 3.2 源码锚点与根因

`src/modules/app_center/views/master_analysis/ai_analysis/services/analysisTimeEstimator.ts`

```ts
// L110-118：静态每调用基准，注释自称"基于本次实测校准"
/** 每调用基准耗时（秒）：按实际推理档位，基于本次实测校准（off 档并发下约 4-8s/调用）。 */
const PER_CALL_SECONDS: Record<ReasoningEffortLevel | 'off', number> = {
  off: 6, low: 12, medium: 25, high: 45, xhigh: 70, max: 100,
};

// L169-176：理想并发公式
const wallSeconds =
  Math.ceil(callCount / effectiveConcurrency) *   // 总调用 ÷ 有效并发（理想并行）
  perCallSeconds *
  resolveSizeFactor(estimatedInputTokens) *
  1.15;                                             // 仅 1.15 倍缓冲
```

根因拆解：

1. **基准值失真**：`low=12s/调用` 明显低于真实延迟。实测单调用经 `new.hongecb.store` 中转 + DeepSeek-v4-flash + 推理档位，实际单次往返远高于 12s。注释声称"实测校准"，但校准基准（off 档 4-8s）与当前线上模型/中转延迟已不匹配，属**过期校准**。
2. **公式缺真实系统项**：未计入首 token 延迟、队列排队、网络抖动、重试（`llm.maxRetries`）、map-reduce 的串行依赖（reduce 必须等全部 map 完成，公式按满并发算，高估并行度）。
3. **无自动校准机制**：估算完全静态，模型/端点/档位变化后不会自愈。
4. **loading 态前置缺失**：进入分析流程后，状态 UI（按钮文案/进度）未在发起请求的同一 tick 更新，导致"点了没反应"的假死观感。

### 3.3 影响

- 时间承诺 22-36 秒，实际 2 分钟+，用户大概率以为卡死 → 刷新/重试 → 重复计费调用。
- 等待期无状态反馈，是本次体检中**体验破坏最严重**的一处。

### 3.4 建议修复方向（供确认，暂不动 UI 文案口径）

用户已定调：**UI 时间为"目标值"展示，动态估算另行规划，本次不修改展示口径**。因此本项修复聚焦"耗时本身 + 状态反馈"：

1. **校准基准**：按 provider/model/effort 分层抽样真实耗时（首 token 延迟 + 总时长），写入可覆盖的校准表；校准数据从真实调用埋点回填。
2. **公式补项**：增加首 token 常量、并发衰减系数（有效并发 ≠ maxConcurrency，map-reduce 串行段单独计）、重试期望。
3. **加载态前置**：点击「开始分析」→ 立即进入分析中状态（按钮禁用 + 阶段文案 + 进度），与请求发出同 tick。
4. **中期**：调度器按真实队列实现并发（而非仅 maxConcurrency 上限），分析中支持流式阶段进度。

---

## 四、P0-2：Keyword Hunter 评审耗时文案硬编码误导

### 4.1 实测证据

- 文案：「这可能需要 10 ~ 30 秒，请耐心等待」（加载阶段固定展示）。
- 实测：SEO 处理页「开始分析」→「进入分析」→ Keyword Hunter 评审，**t+60s 时按钮才恢复为「重新生成」**（即 60s+ 才出报告）。
- 与 P0-1 类似：承诺 10-30s，实际 2x+ 偏差；且两处耗时文案口径不同（22-36s vs 10-30s），用户无一致预期模型。

### 4.2 源码锚点

`src/modules/app_center/views/keyword_hunter/analysis/index.ts`

```ts
// L579-587：showLoadingState 硬编码文案
<p class="font-semibold ${phase.color} text-sm mb-1">${phase.text}</p>
<p class="text-xs text-slate-400">这可能需要 10 ~ 30 秒，请耐心等待</p>
```

### 4.3 建议修复方向

1. 复用与 AI 分析**同源的耗时估算**（目标：两处口径统一）；在估算服务落地前，先改为不承诺具体秒数（如「正在分析，请稍候」+ 阶段轮播）。
2. 完成信号与按钮态统一（见 P2）。

---

## 五、P1：分析/设置场景状态提示集中弹出，无优先级合并

### 5.1 实测证据（分析启动场景采样）

同一时段集中出现（toast / 面板状态条混合）：

| 提示文本 | 类型 | 源码锚点 |
|---|---|---|
| 本机存储占用较高，建议清理缓存或导出备份 | health 消息 → toast/状态条 | `settings/domain/settingsHealth.ts` L38-40（`evaluateSettingsHealth`，阈值 `STORAGE_USAGE_WARN_RATIO=0.8`） |
| N 个危险端点需通过代理或企业网关访问 | 诊断分区文本 | `settings/sections/diagnosticsSection.ts` L78-80 |
| 无匹配设置项 | 搜索空态 | `settings/systemSettings.html` L91-97 |
| 其他标签页已修改设置 | 面板状态条 | `settings/systemSettings.html` L111-119 |

触发路径：系统设置打开即执行 `refreshSettingsHealth()`（`systemSettings.ts` L270-275），随后 `refreshLocalDataUsage` 异步再触发一次；分析流程中若命中存储阈值，健康消息以 toast 形式弹出。

### 5.2 根因

1. 健康检查**只聚合、不分级**：`evaluateSettingsHealth` 把所有消息平铺为 `messages[]`，无 error/warning/info 区分，统一走 toast。
2. 无去重/节流：存储占用警告在每次 health 刷新时重复产生；跨标签页提示与健康提示同时存在。
3. 搜索空态、危险端点文本属于**页面内嵌信息**，本不该以 toast 打扰，但同屏出现时视觉上与 toast 混淆。

### 5.3 建议修复方向

1. 健康消息分级（error > warning > info），仅 error/warning 弹 toast，info 级收敛为面板内嵌状态条（已有 quota warning bar 可复用）。
2. 同一场景只保留 1 条主提示；相同内容节流（如存储警告 10 分钟内只弹一次）。
3. 搜索空态/危险端点维持页面内嵌，确认不经过 toast 通道。

---

## 六、P2：分析完成态检测不稳定（双信号源不一致）

### 6.1 实测证据

- 多次等待「重新生成」按钮恢复时超时（按钮不总是回到该文案）。
- 完成判定另存在「分析完成于 hh:mm:ss」文本路径（`master_analysis/ai_analysis/template.html` L760-764），两者状态来源不同。

### 6.2 源码锚点

```ts
// keyword_hunter/analysis/index.ts L501-505
function getAnalyzeButtonLabel(state: 'active' | 'disabled' | 'loading' | 'success'): string {
  if (state === 'loading') return '分析中…';
  if (state === 'success') return '报告已生成';
  return '重新生成';
}
```

- AI 分析完成态：`template.html` L760-764「分析完成于 <span x-text="reportCompletedAtText">」，由 `isAnalysisComplete` 驱动。
- Keyword Hunter 完成态：按钮 state 驱动（`updateAnalyzeButtonState`），且存在「流式 shell 已存在则不进入经典 loading 态」的分支（`analysis/index.ts` L395-399）——两条路径完成表现不一致。

### 6.3 建议修复方向

1. 统一完成信号源：页面完成态由单一 store 状态（`isAnalysisComplete` / 报告存在性）驱动，按钮文案、完成文本、进度条全部派生自它。
2. 流式 shell 与经典加载态收敛为同一状态机（loading → streaming → done → error）。
3. 补充 E2E/组件测试：断言 loading 态前置、完成态可检测、失败态可重试。

---

## 七、P3：待确认——「网络」分区归入工具策略组

### 7.1 现状（源码锚点）

```ts
// settings/domain/settingsDeepLink.ts L7-14：存在独立 deep-link id
'settings-section-network',

// L68-78：但导航分组归入 tool
case 'settings-section-network': return 'tool';

// settings/domain/settingsSearch.ts L297-304：分区标题也显示为「工具策略」
'settings-section-network': '工具策略',
```

即：**deep-link 存在 `settings-section-network`，但导航与标题一律显示为「工具策略」**。

### 7.2 影响

用户记忆中的「网络/采集网络」分区（代理、抓取配置）在设置中显示为「工具策略」下，搜索「网络」虽能命中，但分区归属语义不直观（工具策略组内还有 LLM 运行策略、Deep Chat、Keyword Hunter 等大量条目）。

### 7.3 待拍板选项

- A. 保持现状（工具策略组），仅优化组内小标题可辨识性——最小改动。
- B. 提升为独立分区「网络与采集」——改动设置导航结构，影响 `SETTINGS_SECTION_ORDER` 与测试。

---

## 八、验证通过项（全链路实测）

| # | 链路 | 实测结果 | 备注 |
|---|---|---|---|
| b1 | 数据采集导入 | 5 产品 JSON 合并导入 → 5 张产品卡 ✅；合并/导入新（覆盖→历史快照）双模式 ✅；评论渲染 ✅；历史快照自动生成 ✅ | 历史快照堆叠高度已优化（此前缺陷已修复） |
| b2 | AI 智能分析 | 证据深度三档**真联动**：快速·推理低·预计 22-36s / 均衡·推理中·1-2 分 / 深入·推理最高·4-5 分 ✅（`AlpinePanel.ts` L1006-1024 动态文案）；分析报告正常生成 | 三档相同系注入 key 位置错误，非 bug |
| b4b | Prompt 生成 | 报告 → Prompt 页「从报告加载」→ 产品 DNA 字段正确填充 ✅ | |
| b6 | Deep Chat | 发送 → **20s 回复，输出无思考前言混入** ✅（用户重点关注项，已确认通过） | |
| b5 | Keyword Hunter | 输入 → 处理页 → 评审页全链路 ✅；评审报告 64/100 生成成功 | 耗时文案问题见 P0-2 |
| b8 | 工作台总览 | 「最近作业」卡片完整（置顶/复制摘要/从列表移除）✅；清理支持最近作业数据（`4c9baf66` 已修） | |
| a | 系统设置 | 导航 5 组 20 项可达；LLM 配置、数据区 9 类清理、外观、开发者诊断 ✅；数据导入导出列表顺序与「纳入本次导入/导出」冗余文案已优化（`b881eccf` 已修） | |

---

## 九、二次确认清单（请逐条拍板）

1. **P0-1**：按"校准基准 + 公式补项 + 加载态前置"方向修，不动 UI 展示口径（目标值展示后续再做动态估算）——是否同意？
   - 若同意，校准数据源用**真实调用埋点**回填（需在 LLM 调用层加耗时统计），还是先按当前实测人工校准一版？
2. **P0-2**：Keyword Hunter 文案是否与 AI 分析统一为同源估算；在估算服务就绪前先改为「正在分析，请稍候」轮播，不承诺秒数——是否同意？
3. **P1**：健康消息分级 + toast 收敛（仅 error/warning 弹 toast）——是否同意？
4. **P2**：统一完成信号源（单一状态机）——是否同意？
5. **P3**：网络分区归属选 A（保持现状+优化标题）还是 B（独立分区）？

---

## 十、后续执行路线（确认后执行）

1. 按二次确认结果出修复 spec（每项附测试清单）。
2. 分两条并行走：耗时校准/状态反馈（P0-1/P0-2，`master_analysis` + `keyword_hunter` 域）；toast 收敛与状态机统一（P1/P2，`settings` + 两个分析域）。
3. 每项修复后按本报告第八节链路做回归（含 128s 级等待场景），通过后提交、推送、发版。
