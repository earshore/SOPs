# 发版审查 — 3.0.12-rc.3

**审查日期**: 2026-07-29
**当前版本**: 3.0.12-rc.2 → 目标 **3.0.12-rc.3**
**改动主题**: AI 智能分析页面样式可读性修复 + 控件适配（浅/深主题 + 色调）

---

## 一、静态代码审查（五轴）

### 改动文件

| 文件 | 改动 | 行为影响 |
| --- | --- | --- |
| `src/.../ai_analysis/template.html` | ~80 处类名替换 | 纯样式值，无结构/逻辑变化 |
| `src/.../ai_analysis/components/AlpinePanel.ts` | ~10 处类名替换 + `runAnalysisButtonClass` 4 状态重写 | getter 返回的类名字符串，无逻辑变化 |
| `src/.../ai_analysis/ai_analysis_style.css` | 删 8 行死代码 + 证据深度下拉框样式重构 | 纯 CSS |
| `ai-analysis-contrast-audit.md` | 新增诊断报告 | 文档 |
| `scripts/_fix-ai-analysis-classes.{cjs,ps1}`、`scripts/_fix-diag.ps1` | 调试残留临时文件 | **应删除，不提交** |

### 1. Correctness

- 替换引用的 CSS 变量（`--color-text-primary/secondary/tertiary`、`--color-bg-secondary/tertiary`、`--color-bg-hover`、`--border-subtle`）均在 `src/css/foundation/variables.css` 定义，light/dark 均有值 ✓
- `bg-white/N`（N≤60）不被 `dark-content-compat.css` 重映射（compat 仅重映射 ≥70%），dark 下保持白色透明 ✓
- `border-white/50` 不在 compat 重映射列表（60/70/80）✓
- `runAnalysisButtonClass` 四状态覆盖：isAnalyzing / canRunAnalysis∧¬strong / canRunAnalysis∧strong / disabled，无遗漏分支 ✓
- TS 模板字符串（反引号）、单引号字符串闭合正确（已验证 517/525 行）✓
- CSS 删除死代码后上下文连贯（已验证 142-237 行）✓

### 2. Readability

- 类名替换遵循页面原有 `text-[color:var(--color-text-secondary,#64748b)]` 先例，写法一致 ✓
- `runAnalysisButtonClass` 注释保留（"Appearance primary for default workbench CTA"）✓

### 3. Architecture

- 未改 HTML 结构、类名标识、TS 逻辑分支，纯样式值替换 + CSS 规则重构 ✓
- 未触碰路由/DI/事件总线等基础设施 ✓

### 4. Security

- 纯 UI 样式，无输入处理/鉴权/数据流变化 ✓

### 5. Performance

- CSS 变量解析，任意值类由 Tailwind JIT 生成（content 配置含 `src/**/*.{ts,html}`）✓
- 无新增运行时开销 ✓

### 风险点

| 级别 | 项 | 说明 |
| --- | --- | --- |
| ⚠️ Important | **未跑 build/smoke** | 本会话 shell 工具失效（Bash/PowerShell 均 exit 1 无输出无副作用），无法验证编译与运行时。改动类型安全（纯类名/CSS 值），但 **Tailwind JIT 是否正确生成所有任意值类需 build 确认**。页面原有 `text-[color:var(...)]` 写法已存在，风险低。 |
| ⚠️ Important | 临时文件 | `scripts/_fix-ai-analysis-classes.cjs`、`.ps1`、`scripts/_fix-diag.ps1` 三个调试残留文件需删除，否则进 commit |
| 💡 Suggestion | 诊断报告 | `ai-analysis-contrast-audit.md`（项目根）可提交作为修复记录，或移入 `docs/` |
| 📋 遗留 | `bg-surface` 死类名 | `AlpinePanel.ts` 仍有 5 处 `bg-surface`（`analysisHeroBackdropClass` 非 strong hero 背景、metricPill、perfButton、iconWrap）。本次只修了按钮。不影响本次发版（那些控件 strong 态有 `text-white`/`border-white` 兜底），但建议后续治理 |

### Verdict: **REQUEST CHANGES**（发版前需处理）

- Critical: 无
- Important: 删除 3 个临时脚本；本地跑 build+smoke 验证
- 其余可接受

---

## 二、发版步骤清单（本地执行）

> ⚠️ **关键顺序**：`vite.config.js` 的 `getAppVersion()` 用 `git describe --tags --abbrev=0` 取版本号。**必须先 commit + tag，再 build**，否则构建产物烘焙的是上一个 tag 的版本号。

```bash
# 0. 清理临时文件
rm scripts/_fix-ai-analysis-classes.cjs scripts/_fix-ai-analysis-classes.ps1 scripts/_fix-diag.ps1

# 1. 版本 bump（4 处，按项目 rc checklist）
#    - package.json: "version" → "3.0.12-rc.3"
#    - package-lock.json: 顶层 + packages[""].version 两处
#    - README.md: 3 处 rc.x 引用 + 最新发布 highlight 块
#    - docs/CHANGELOG.md: 在 [Unreleased] 后插入 [3.0.12-rc.3] 条目（见下方草案）

# 2. 静态检查
npm run type-check
npm run lint

# 3. commit（含 bump + 改动 + 诊断报告）
git add -A
git commit -F- <<'EOF'
fix(ai-analysis): 修复样式可读性与控件适配，适配浅/深主题与色调

- 误用 Tailwind 语义类替换为设计令牌任意值语法（~90 处）：
  text-primary/secondary/tertiary、bg-secondary/tertiary → var(--color-text-*/--color-bg-*)
- 证据深度下拉框双层框修复：外层退化为布局容器，select 单层边框，
  hero 强对比态切换为半透明白底+白字，与主操作按钮组外观契合
- 开始分析按钮 bg-surface 死类名修复（加载 ASIN 后不可见），
  runAnalysisButtonClass 四状态完整适配浅/深主题与 Appearance 色调
- 删除 ai_analysis_style.css 无效 dark 覆盖死代码

Refs: ai-analysis-contrast-audit.md
EOF

# 4. tag（build 前必须！）
git tag v3.0.12-rc.3

# 5. build
npm run build

# 6. smoke 验证（预览构建产物）
npm run preview
#    重点检查 AI 智能分析页面：
#    - 统计概览栏卡片不再是深灰蓝块
#    - 辅助文本有浅灰层次
#    - 证据深度下拉框无双层框，与按钮同风格
#    - 加载 ASIN + 选目标后，"开始分析"按钮在深色渐变 hero 上可见
#    - 切换浅/深主题，按钮与下拉框都正确

# 7. 部署（Cloudflare Pages）
npx wrangler pages deploy dist --project-name sops
#    瞬时 fetch/proxy 错误重试 1-2 次

# 8. 线上验证
curl -s https://sops.hongecb.store | grep -o "3.0.12-rc.3"
curl -s https://sops-3js.pages.dev | grep -o "3.0.12-rc.3"
#    两个域名都应返回 200 并含新版本号
```

---

## 三、CHANGELOG 草案

插入到 `docs/CHANGELOG.md` 的 `[Unreleased]` 块之后、`[3.0.12-rc.2]` 之前：

```markdown
## [3.0.12-rc.3] - 2026-07-29

> 生产验证候选版。GitHub Release 保持 **Pre-release**，Latest 继续指向稳定 GA `v3.0.11`。
> 收口 AI 智能分析页面样式可读性与控件适配问题。
> 生产回滚目标为 `v3.0.11` 对应的上一条 Pages 部署。
> 部署目标：https://sops.hongecb.store

### Fixed

- AI 智能分析页面：将误用的 Tailwind 语义类（`text-primary`/`text-secondary`/`text-tertiary`/`bg-secondary`/`bg-tertiary`）替换为引用设计令牌的任意值语法，修复浅/深主题下文字与背景对比度不足、辅助文本层次丢失、统计概览栏卡片渲染成深灰蓝块、关键词标签对比度差等问题。
- 证据深度下拉框：移除外层 `box-shadow` 光圈与内层 `border` 形成的"双层框"；外层退化为布局容器，select 单层边框并按 hero 强对比态切换为半透明白底+白字，与旁边主操作按钮组外观契合。
- 开始分析/清除缓存按钮：修复 `bg-surface` 死类名（Tailwind 配置无 `surface` 色键）导致加载 ASIN 后按钮在深色渐变 hero 上不可见；`runAnalysisButtonClass` 四状态（分析中/可运行×强对比/可运行×普通/禁用）完整适配浅色/深色主题与 Appearance 色调。

### Changed

- 删除 `ai_analysis_style.css` 中无效的 dark 模式覆盖死代码（覆盖的体系 B 变量 `--text-secondary` 等无任何类引用）。
```

---

## 四、未完成项（因环境限制）

| 项 | 状态 | 原因 |
| --- | --- | --- |
| build | ❌ 未执行 | 本会话 shell 工具失效，无法运行 `npm run build` |
| smoke | ❌ 未执行 | 同上，无法运行 `npm run preview` / Playwright |
| commit | ❌ 未执行 | 同上，无法运行 `git commit` |
| tag | ❌ 未执行 | 同上，无法运行 `git tag` |
| deploy | ❌ 未执行 | 同上 |

以上均需本地执行。静态审查通过，改动类型安全，但 **build+smoke 是发版硬门槛，不可跳过**。

---

## 五、发版前需处理的发现（本次审查新发现）

### ⚠️ 发现 1：`package-lock.json` 与 `package.json` 版本不一致

| 文件 | 当前 version |
| --- | --- |
| `package.json` | `3.0.12-rc.2` |
| `package-lock.json`（顶层 + `packages[""]`） | `3.0.11` |

**判断**：`v3.0.12-rc.1`/`rc.2` 发版时未同步 `package-lock.json`（memory 的 rc checklist 要求改两处，但实际未执行）。

**处理建议**：发 rc.3 前，本地先 `npm install` 让 npm 自动把 lockfile 同步到 `package.json` 的 `3.0.12-rc.3`，**不要手动改 package-lock.json**（易破坏依赖树完整性）。同步后确认 lockfile 两处 version 为 `3.0.12-rc.3` 再 commit。

### 💡 发现 2：项目有 `release:*` 发版脚本

`README.md:35` 提到：
```
npm run release:validate / release:notes / release:package / release:gate / release:sync-all
```

**判断**：这些脚本可能已封装版本 bump / CHANGELOG / tag / 校验逻辑。**建议优先用脚本发版**，而非手动逐文件 bump——避免与脚本逻辑冲突或重复。

**建议本地先确认脚本能力**：
```bash
# 查看脚本做了什么
node -e "console.log(JSON.stringify(require('./package.json').scripts,null,2))" | grep release
# 或直接看 scripts/ 目录下的 release 脚本实现
```

如果脚本能自动 bump + 校验，则流程简化为：
```bash
rm scripts/_fix-ai-analysis-classes.cjs scripts/_fix-ai-analysis-classes.ps1 scripts/_fix-diag.ps1
npm install                       # 同步 lockfile
npm run release:validate          # 脚本可能含 bump + 校验
git add -A && git commit
git tag v3.0.12-rc.3
npm run build
npm run preview                   # smoke
npx wrangler pages deploy dist --project-name sops
```

如果脚本不自动 bump，则按报告第二节的手动 checklist（4 处文件）执行。**先确认脚本能力再选路径**，别两套都做。

