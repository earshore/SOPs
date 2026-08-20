# sops 工作台 · 用户体验满意度审计报告

> 对象：`earshore/SOPs`（亚马逊运营管理平台，Vite + TS 自研 SPA，单用户 BYOK 静态站）
> 评估视角：端到端用户满意度（上手 → 日常使用 → 出错恢复 → 长期留存）
> 方法：通读 `home`(Launchpad)、`ErrorBoundary`、`llmFailureUx`、`settingsHealth`、`notifications`、`search`、首页粒子系统、`menuConfig` 等核心代码，结合 README 定位（"收敛为小团队内部运营作业系统"）。

---

## 一、已经做得很好的地方（请保持）

这些是真实的工程亮点，不是客套话——很多同类工具都缺：

1. **错误体验高度专业化**（`src/common/errors/llmFailureUx.ts`）
   把 `ERR_LLM_API_KEY_MISSING / API_QUOTA_EXCEEDED / 401 / 429…` 等错误码映射成**可操作的中文文案 +「打开设置」深链按钮**，用户出错即被带去正确位置。这是满意度最高的设计之一。
2. **状态覆盖完整**：`ErrorBoundary` 统一了 error / loading / empty / timeout / not-registered 五种状态，且都有「重试 / 刷新 / 去别处」的出口。
3. **无障碍基础扎实**：toast 按类型设 `role=alert/status` + `aria-live`；按钮有 `focus-visible` 焦点环；欢迎横幅做了 `aria-hidden` 收敛（`welcomeBannerA11y.ts`）；全站 CSS 有 `prefers-reduced-motion`。
4. **深浅色对比度审计**：README 记录 40 路由 × 双模式 = 0 缺陷，含 toast、badge 等易翻车区域。
5. **Toast 能力完整**：支持 `success/error/warning/info` + 可选 CTA 按钮。

---

## 二、满意度缺口（按影响排序，附代码证据）

### 🔴 P0-1：首屏"假在线"，配置摩擦是最大痛点

**现象**：首页常驻标语 `AI SYSTEM ONLINE · READY TO TRANSFORM`，但作为 BYOK 站点，**未配置 Key 时 AI 根本不可用**。新用户点工具 → 弹错误 toast → 自己去找设置。

**证据**：
- `homeDisplay.html` 中 `.ai-status` 是写死的静态文案，不与配置状态绑定（`homeDisplay.ts` 只更新时钟，从不读 `settingsHealth`）。
- 全代码库搜索 `firstRun / onboard / guided / setup-wizard / isFirstVisit` **全部为空**——没有任何首启引导。
- `evaluateSettingsHealth()` 存在，但只在「打开设置面板时」被动展示，新用户根本不会主动去设置里看。

**影响**：第一印象就"失信"（说在线其实没在线），且把最高的上手成本甩给用户自己摸索。

**建议**：
1. 把假状态徽标换成**真实状态**（由 `settingsHealth` 驱动）：`未配置 / 已连接 / 上次出错`。
2. 未配置时，首屏置顶一张「**2 步接入 AI**」引导卡：选厂商 → 填 Key → 自动同步模型，卡片一键深链打开设置对应 section。
3. 中转站 endpoint `https://new.hongecb.store/v1` **预填为默认值**，运营同学不必懂 URL。
4. 配置完成后引导卡变为「开始第一次任务」。

---

### 🔴 P0-2：成功反馈不均等，"做完没底"

**现象**：成功 toast 是有的（约 11 处），但**高度集中在「设置保存」和 Keyword Hunter 分析**；真正重要的作业闭环（采集完成、AI 生成完成、PPC 导出、Deep Chat 产出）往往**静默结束**。

**证据**（`type:'success'` 命中分布）：
- 集中在 `settings/*`（LLM 已保存、代理连接成功、策略已保存、数据已导出）与 `keyword_hunter/analysis`、`keyword_hunter/input`（报告生成成功、快照已保存）。
- `Master Analysis` 采集/分析、`PPC Tools`、`Playground/Deep Chat` 生成结果后**未见完成确认 toast**。

**影响**：用户最关心的"动作成没成"反而没反馈 → 重复点击、焦虑、不信任系统。

**建议**：在每个「有输入 → 可交付输出」的闭环末尾补 success toast，并给出下一步（查看 / 导出 / 继续）。封装一个统一方法 `announceDone(title, nextAction?)`，保证全站一致。

---

### 🟠 P1-1：首页粒子动画违背 reduced-motion，且空耗资源

**现象**：`homeDisplay.ts` 跑 **60fps 的 `requestAnimationFrame` + 全局 `mousemove` 监听**，无条件执行。CSS 虽写了 `prefers-reduced-motion`，但那只管 CSS 过渡，**拦不住 canvas 的 JS 动画循环**；也没有 `visibilitychange` 暂停、没有移动端判定。

**证据**：
- `homeDisplay.ts` 的 `animate()` / `handleMouseMove()` 无 `matchMedia('(prefers-reduced-motion: reduce)')` 判断；
- `homeDisplay.css:1058` 的 reduced-motion 规则仅作用于 CSS 过渡/动画，canvas 不受影响；
- 好的一面：`#particles-canvas` 已设 `pointer-events:none`，不挡点击。

**影响**：运营同学常把页面挂着一整天 → 续航/发热/风扇噪声；晕动症用户不适；对一个"收敛为作业系统"的产品，纯炫技的首页 splash 反而稀释专业感。

**建议**：
1. `prefers-reduced-motion: reduce` 时**跳过 canvas**，仅留静态渐变背景。
2. `visibilitychange` 切到后台时 `cancelAnimationFrame`，回到前台再恢复。
3. 移动端 / 低端设备降级为静态图。
4. 产品层面：首页应从"营销 splash"转向"工作台"——把「今日待办 / 最近作业 / 我的常用」前置，粒子退为可关闭的氛围元素。

---

### 🟠 P1-2：缺全局命令面板（⌘K），40 路由跳转成本高

**现象**：现有搜索是 SOPs / 智库 / 侧边栏 **三处互相独立的输入框**，且只过滤"当前模块"的路由。没有键盘优先的全局跳转。

**证据**：`search.ts` 提供 `searchSOPs / searchHub / searchSidebar` 三个独立函数；全代码库无 `cmd+k / ctrl+k / command palette`。

**影响**：老手效率瓶颈。README 自述 **40 路由**，IA 广度本身就会放大"找不到入口"的焦虑。

**建议**：加一个 ⌘K 命令面板（模糊搜索全部 40 路由 + 动作如"导出备份 / 打开设置 / 同步模型"），直接复用 `MENU_CONFIG.routes`。这是投入小、体感提升极大的一项。

---

### 🟡 P2-1：空状态偏通用，缺"下一步动作"

**现象**：`renderEmpty()` 是通用文案"暂无内容 / 完成导入、筛选或配置后，这里会显示对应结果"。

**建议**：借鉴 `llmFailureUx` 的"具体性"——按工具给带 CTA 的空态，如「还没有采集过 ASIN，点此开始第一次采集」「还没有关键词，先跑一次 Keyword Hunter」。

---

### 🟡 P2-2：缺"本次更新了什么"轻提示

**现象**：发版极快（README 显示一周内多个 RC），但应用内**没有**升级后的 what's-new 轻提示（菜单里只有一个"新功能"入口）。

**建议**：读取 `CHANGELOG` 顶部，版本升级后弹一次**可关闭**的"本次更新"卡片。快速发版若用户无感，既浪费投入、又容易让人怕"又偷偷改坏了"。

---

### 🟡 P2-3：新人与老人缺分层面板

**现象**：5 模块 40 路由同等曝光，无"常用 / 收藏 / 按角色默认落地"。

**建议**：首页 Launchpad 增加「我的常用」持久区（localStorage 记录点击频率）+ 角色默认视图（新人看引导流，老手看工具矩阵）。

---

## 三、给维护者的快速验证清单

- [ ] 真机手机打开首页，粒子是否掉帧 / 发热？
- [ ] 未配置 Key 时，首页是否仍显示 "AI SYSTEM ONLINE"？
- [ ] 跑一次采集 / 分析 / 导出，是否收到成功 toast？
- [ ] 能否用 ⌘K 直达任意一个工具？
- [ ] 删掉 localStorage 重新打开，是否有"接入引导"而非直接进 splash？

---

## 四、优先级与预期收益

| 优先级 | 问题 | 用户感知收益 | 改动难度 |
|---|---|---|---|
| P0 | 首屏真实 AI 状态 + 2 步接入引导 | 第一印象可信、上手时间从"自己摸索"降到 2 分钟 | 中 |
| P0 | 成功反馈闭环（采集/生成/导出） | "做完有底"，减少重复操作与焦虑 | 低 |
| P1 | 粒子动画 reduced-motion + 后台暂停 + 移动降级 | 续航/健康/无障碍合规 | 低 |
| P1 | ⌘K 命令面板 | 老手效率质的飞跃 | 中 |
| P2 | 具体空态 / what's-new / 我的常用 | 流畅感与持续信任 | 低~中 |

---

## 五、下一步

以上 P0 两项（**首启接入引导 + 真实状态**、**成功反馈闭环**）投入产出比最高，且都能直接复用仓库已有的 `settingsHealth` / `llmFailureUx` / toast 能力。

如果你愿意，我可以：
1. 直接给出 **首屏接入引导卡 + 真实 AI 状态徽标** 的最小改动补丁（改 `homeDisplay.html/.ts` + 接 `evaluateSettingsHealth`）；
2. 或先帮你把 **⌘K 命令面板** 原型做出来（基于 `MENU_CONFIG`）。

告诉我先动哪一项即可。
