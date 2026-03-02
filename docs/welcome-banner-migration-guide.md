# Welcome Banner 组件迁移指南

## 目录

1. [概述](#概述)
2. [升级前准备](#升级前准备)
3. [升级步骤](#升级步骤)
4. [破坏性变更](#破坏性变更)
5. [自动化迁移](#自动化迁移)
6. [手动迁移](#手动迁移)
7. [验证和测试](#验证和测试)
8. [回滚方案](#回滚方案)
9. [常见问题](#常见问题)

---

## 概述

本迁移指南帮助您从旧版本的 Welcome Banner 组件升级到优化版本。优化版本包含以下改进：

### 新增功能

- **8 种徽章主题系统**：AI、Growth、Safety、Service、Supply、Analytics、Pro、Hub
- **增强动画效果**：脉冲、闪烁、渐变移动等动画
- **暗色模式适配**：自动适配系统暗色模式
- **优化响应式布局**：支持桌面、平板、移动端（≥375px）
- **增强无障碍支持**：符合 WCAG AA 标准
- **性能优化**：GPU 加速动画，首次渲染 ≤100ms，动画帧率 ≥60fps

### 兼容性

- **向后兼容**：旧版本的 HTML 结构仍然可以正常工作
- **渐进增强**：可以逐步迁移，不需要一次性修改所有页面
- **无破坏性变更**：CSS 类名保持不变，仅新增功能

### 迁移时间估算

| 页面数量 | 手动迁移 | 自动化迁移 |
|---------|---------|-----------|
| 1-5 页面 | 30-60 分钟 | 5-10 分钟 |
| 6-20 页面 | 2-4 小时 | 10-20 分钟 |
| 21-40 页面 | 4-8 小时 | 20-30 分钟 |
| 40+ 页面 | 8+ 小时 | 30-60 分钟 |

---

## 升级前准备

### 1. 备份现有文件

在开始迁移前，务必备份所有相关文件：

```bash
# 备份 HTML 模板文件
cp -r src/modules src/modules.backup

# 备份 CSS 文件
cp src/css/components/welcome-banner.css src/css/components/welcome-banner.css.backup

# 或使用 Git 创建分支
git checkout -b welcome-banner-migration
git add .
git commit -m "Backup before Welcome Banner migration"
```

### 2. 检查当前版本

确认当前使用的 Welcome Banner 版本：

```bash
# 检查 CSS 文件是否包含徽章主题类
grep -n "wb-badge-ai" src/css/components/welcome-banner.css

# 如果没有找到，说明使用的是旧版本
```

### 3. 运行验证脚本

使用验证脚本检查现有页面的状态：

```bash
# 安装 Python 依赖（如果需要）
pip3 install beautifulsoup4 lxml

# 运行验证脚本
python3 scripts/validate-welcome-banner.py --dir src/modules --output pre-migration-report.json --verbose

# 查看报告
cat pre-migration-report.json
```

### 4. 记录自定义样式

如果您对 Welcome Banner 组件进行了自定义修改，请记录这些修改：

```bash
# 查找自定义样式
grep -r "wb-" src/css/pages/
grep -r "wb-" src/css/custom/

# 记录自定义样式到文件
grep -r "wb-" src/css/pages/ > custom-styles.txt
```

### 准备清单

- [ ] 备份所有相关文件
- [ ] 确认当前版本
- [ ] 运行验证脚本并保存报告
- [ ] 记录自定义样式
- [ ] 通知团队成员即将进行迁移
- [ ] 安排测试时间


---

## 升级步骤

### 步骤 1: 更新 CSS 文件

#### 1.1 替换 CSS 文件

```bash
# 备份旧版本
cp src/css/components/welcome-banner.css src/css/components/welcome-banner.css.old

# 复制新版本（假设新版本在 dist 目录）
cp dist/welcome-banner.css src/css/components/welcome-banner.css
```

#### 1.2 验证 CSS 文件

```bash
# 检查文件大小（应该 < 8KB）
du -h src/css/components/welcome-banner.css

# 检查是否包含新功能
grep -n "wb-badge-ai" src/css/components/welcome-banner.css
grep -n "@keyframes pulse" src/css/components/welcome-banner.css
grep -n "prefers-color-scheme: dark" src/css/components/welcome-banner.css
```

### 步骤 2: 运行自动化迁移工具

使用迁移工具自动添加徽章主题类和无障碍属性：

```bash
# 预览模式（不实际修改文件）
python3 scripts/migrate-welcome-banner-v2.py \
  --dir src/modules \
  --add-theme \
  --add-aria \
  --dry-run

# 查看预览结果，确认无误后执行实际迁移
python3 scripts/migrate-welcome-banner-v2.py \
  --dir src/modules \
  --add-theme \
  --add-aria \
  --backup \
  --log migration-log.txt

# 查看迁移日志
cat migration-log.txt
```

### 步骤 3: 手动检查和调整

自动化迁移可能无法处理所有情况，需要手动检查：

#### 3.1 检查徽章主题类

```bash
# 查找所有徽章元素
grep -rn "wb-badge" src/modules/ | grep -v "wb-badge-"

# 手动为缺少主题类的徽章添加合适的主题类
```

#### 3.2 检查无障碍属性

```bash
# 查找缺少 aria-label 的徽章
grep -rn "wb-badge" src/modules/ | grep -v "aria-label"

# 查找缺少 aria-hidden 的图标
grep -rn "<i class=" src/modules/ | grep -v "aria-hidden"
```

#### 3.3 调整自定义样式

如果您有自定义样式，需要调整以适配新版本：

```css
/* 旧版本自定义样式 */
.custom-page .wb-badge {
  background: linear-gradient(135deg, #ec4899, #f43f5e);
}

/* 新版本：使用 CSS 变量 */
.custom-page .wb-badge {
  --badge-gradient: linear-gradient(135deg, #ec4899, #f43f5e);
  --badge-shadow: 0 2px 8px rgba(236, 72, 153, 0.15);
}
```

### 步骤 4: 验证迁移结果

#### 4.1 运行验证脚本

```bash
# 运行验证脚本
python3 scripts/validate-welcome-banner.py \
  --dir src/modules \
  --output post-migration-report.json \
  --verbose

# 对比迁移前后的报告
diff pre-migration-report.json post-migration-report.json
```

#### 4.2 浏览器测试

在浏览器中测试所有页面：

1. **视觉测试**：
   - 徽章主题颜色是否正确
   - 动画是否流畅
   - 暗色模式是否适配
   - 响应式布局是否正确

2. **功能测试**：
   - 可点击元素是否可以点击
   - 键盘导航是否正常
   - 屏幕阅读器是否可以读取

3. **性能测试**：
   - 首次渲染时间是否 < 100ms
   - 动画帧率是否 ≥ 60fps

### 步骤 5: 提交变更

```bash
# 查看变更
git status
git diff

# 提交变更
git add .
git commit -m "Migrate Welcome Banner to optimized version

- Add badge theme classes
- Add ARIA attributes
- Update CSS to optimized version
- Test all pages in browser"

# 推送到远程仓库
git push origin welcome-banner-migration
```

### 升级清单

- [ ] 更新 CSS 文件
- [ ] 运行自动化迁移工具
- [ ] 手动检查和调整
- [ ] 运行验证脚本
- [ ] 浏览器测试
- [ ] 提交变更

---

## 破坏性变更

虽然新版本保持向后兼容，但以下变更可能影响您的自定义样式：

### CSS 变量变更

#### 新增 CSS 变量

新版本新增了以下 CSS 变量：

```css
/* 徽章主题变量 */
--badge-gradient: linear-gradient(135deg, #3b82f6, #6366f1);
--badge-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);

/* 暗色模式变量 */
--wb-text-primary: #0f172a;
--wb-text-secondary: #64748b;
--wb-border-color: rgba(0, 0, 0, 0.1);
--wb-tag-bg: rgba(255, 255, 255, 0.7);
```

**影响**：如果您的自定义样式直接使用颜色值，可能需要调整为使用 CSS 变量。

**迁移方法**：

```css
/* 旧版本 */
.custom-page .wb-badge {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
}

/* 新版本 */
.custom-page .wb-badge {
  --badge-gradient: linear-gradient(135deg, #3b82f6, #6366f1);
}
```

### 动画变更

#### 新增动画

新版本新增了以下动画：

```css
@keyframes pulse {
  0%, 100% { transform: scale(1) translateZ(0); }
  50% { transform: scale(1.05) translateZ(0); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

**影响**：如果您的自定义样式使用了相同名称的动画，可能会冲突。

**迁移方法**：

```css
/* 重命名自定义动画 */
@keyframes customPulse {
  /* ... */
}

.custom-page .wb-badge {
  animation: customPulse 2s ease-in-out infinite;
}
```

### 响应式断点变更

#### 调整断点值

新版本调整了响应式断点：

| 断点 | 旧版本 | 新版本 |
|------|--------|--------|
| 平板 | ≤800px | ≤768px |
| 移动端 | ≤600px | ≤480px |
| 超小屏幕 | - | ≤375px |

**影响**：如果您的自定义样式使用了不同的断点值，可能需要调整。

**迁移方法**：

```css
/* 旧版本 */
@media (max-width: 800px) {
  .custom-page .wb-content {
    padding: 1rem;
  }
}

/* 新版本 */
@media (max-width: 768px) {
  .custom-page .wb-content {
    padding: 1rem;
  }
}
```

### 暗色模式变更

#### 新增暗色模式支持

新版本新增了暗色模式支持：

```css
@media (prefers-color-scheme: dark) {
  .wb-container,
  .wb-card {
    --wb-text-primary: #f1f5f9;
    --wb-text-secondary: #cbd5e1;
    /* ... */
  }
}
```

**影响**：如果您的自定义样式没有考虑暗色模式，可能在暗色模式下显示不正确。

**迁移方法**：

```css
/* 添加暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .custom-page .wb-container {
    --wb-text-primary: #e2e8f0;
    --wb-text-secondary: #94a3b8;
  }
}
```

### 变更对照表

| 变更类型 | 旧版本 | 新版本 | 影响 | 迁移难度 |
|---------|--------|--------|------|---------|
| CSS 变量 | 无 | 新增 | 低 | 简单 |
| 动画 | 基础动画 | 新增脉冲、闪烁等 | 低 | 简单 |
| 响应式断点 | 800px, 600px | 768px, 480px, 375px | 中 | 中等 |
| 暗色模式 | 无 | 新增 | 中 | 中等 |
| 徽章主题 | 无 | 8 种主题 | 低 | 简单 |
| 无障碍属性 | 部分 | 完整 | 低 | 简单 |

---

## 自动化迁移

使用迁移工具可以自动完成大部分迁移工作。

### 迁移工具功能

迁移工具 (`scripts/migrate-welcome-banner-v2.py`) 提供以下功能：

1. **自动添加徽章主题类**：为缺少主题类的徽章自动添加合适的主题类
2. **自动添加 ARIA 属性**：为徽章和图标添加 `aria-label` 和 `aria-hidden` 属性
3. **文件备份**：在修改文件前自动创建 `.bak` 后缀的备份文件
4. **日志记录**：记录所有变更到日志文件
5. **Dry-run 模式**：预览变更而不实际修改文件

### 命令行参数

```bash
python3 scripts/migrate-welcome-banner-v2.py [options]

选项:
  --dir <path>           扫描目录（默认：src/modules）
  --dry-run              预览模式（不实际修改文件）
  --backup               创建备份（默认：true）
  --log <file>           日志文件（默认：migration-log.txt）
  --add-aria             添加 ARIA 属性
  --add-theme            添加徽章主题类
  --verbose              详细输出
```

### 使用示例

#### 1. 预览模式

```bash
# 预览将要进行的变更
python3 scripts/migrate-welcome-banner-v2.py \
  --dir src/modules \
  --add-theme \
  --add-aria \
  --dry-run \
  --verbose
```

**输出示例**：

```
扫描目录: src/modules
找到 40 个 HTML 文件

文件: src/modules/app_center/views/qalab/template.html
  行 15: 添加徽章主题类 wb-badge-ai
  行 15: 添加 aria-label="人工智能功能"
  行 16: 添加 aria-hidden="true" 到图标

文件: src/modules/app_center/views/keyword_hunter/template.html
  行 20: 添加徽章主题类 wb-badge-analytics
  行 20: 添加 aria-label="分析功能"

总计:
  - 修改文件: 35
  - 添加徽章主题类: 42
  - 添加 ARIA 属性: 87
```

#### 2. 实际迁移

```bash
# 执行实际迁移
python3 scripts/migrate-welcome-banner-v2.py \
  --dir src/modules \
  --add-theme \
  --add-aria \
  --backup \
  --log migration-log.txt \
  --verbose
```

**输出示例**：

```
扫描目录: src/modules
找到 40 个 HTML 文件

正在迁移...
[1/35] src/modules/app_center/views/qalab/template.html
  ✓ 创建备份: template.html.bak
  ✓ 添加 2 个徽章主题类
  ✓ 添加 5 个 ARIA 属性

[2/35] src/modules/app_center/views/keyword_hunter/template.html
  ✓ 创建备份: template.html.bak
  ✓ 添加 1 个徽章主题类
  ✓ 添加 3 个 ARIA 属性

...

迁移完成!
  - 修改文件: 35
  - 添加徽章主题类: 42
  - 添加 ARIA 属性: 87
  - 创建备份: 35
  - 日志文件: migration-log.txt
```

#### 3. 仅添加徽章主题类

```bash
# 仅添加徽章主题类，不添加 ARIA 属性
python3 scripts/migrate-welcome-banner-v2.py \
  --dir src/modules \
  --add-theme \
  --backup
```

#### 4. 仅添加 ARIA 属性

```bash
# 仅添加 ARIA 属性，不添加徽章主题类
python3 scripts/migrate-welcome-banner-v2.py \
  --dir src/modules \
  --add-aria \
  --backup
```

### 迁移日志

迁移工具会生成详细的日志文件：

```
=== Welcome Banner 迁移日志 ===
时间: 2024-01-15 10:30:00
目录: src/modules
选项: --add-theme --add-aria --backup

文件: src/modules/app_center/views/qalab/template.html
  备份: template.html.bak
  变更:
    - 行 15: 添加 class="wb-badge-ai"
    - 行 15: 添加 aria-label="人工智能功能"
    - 行 16: 添加 aria-hidden="true"

文件: src/modules/app_center/views/keyword_hunter/template.html
  备份: template.html.bak
  变更:
    - 行 20: 添加 class="wb-badge-analytics"
    - 行 20: 添加 aria-label="分析功能"

...

总计:
  - 扫描文件: 40
  - 修改文件: 35
  - 跳过文件: 5
  - 添加徽章主题类: 42
  - 添加 ARIA 属性: 87
  - 创建备份: 35
```


---

## 手动迁移

对于自动化工具无法处理的情况，需要手动迁移。

### 场景 1: 添加徽章主题类

#### 迁移前

```html
<span class="wb-badge" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>
```

#### 迁移后

```html
<span class="wb-badge wb-badge-ai" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>
```

#### 主题选择参考

| 页面类型 | 推荐主题 |
|---------|---------|
| AI 功能 | `wb-badge-ai` |
| 数据分析 | `wb-badge-analytics` |
| 增长工具 | `wb-badge-growth` |
| 安全中心 | `wb-badge-safety` |
| 客服系统 | `wb-badge-service` |
| 供应链 | `wb-badge-supply` |
| 高级功能 | `wb-badge-pro` |
| 功能中心 | `wb-badge-hub` |

### 场景 2: 添加 ARIA 属性

#### 迁移前

```html
<!-- 缺少 aria-label -->
<span class="wb-badge wb-badge-ai">
  <i class="fa-solid fa-sparkles"></i>
  <span>AI</span>
</span>

<!-- 缺少 aria-hidden -->
<div class="wb-icon-main">
  <i class="fa-solid fa-robot"></i>
</div>
```

#### 迁移后

```html
<!-- 添加 aria-label -->
<span class="wb-badge wb-badge-ai" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>

<!-- 添加 aria-label 和 aria-hidden -->
<div class="wb-icon-main" aria-label="人工智能功能图标">
  <i class="fa-solid fa-robot" aria-hidden="true"></i>
</div>
```

#### ARIA 标签参考

| 徽章主题 | aria-label |
|---------|-----------|
| AI | "人工智能功能" |
| Growth | "增长功能" |
| Safety | "安全警告" |
| Service | "服务功能" |
| Supply | "供应链功能" |
| Analytics | "分析功能" |
| Pro | "专业功能" |
| Hub | "中心功能" |

### 场景 3: 使用语义化 HTML

#### 迁移前

```html
<!-- 使用 div -->
<div class="wb-tags">
  <div class="wb-tag">
    <div class="wb-tag-dot"></div>
    <span>智能生成</span>
  </div>
  <div class="wb-tag">
    <div class="wb-tag-dot"></div>
    <span>多维度分析</span>
  </div>
</div>
```

#### 迁移后

```html
<!-- 使用 ul/li -->
<ul class="wb-tags" role="list">
  <li class="wb-tag" role="listitem">
    <div class="wb-tag-dot" aria-hidden="true"></div>
    <span>智能生成</span>
  </li>
  <li class="wb-tag" role="listitem">
    <div class="wb-tag-dot" aria-hidden="true"></div>
    <span>多维度分析</span>
  </li>
</ul>
```

### 场景 4: 可点击徽章

#### 迁移前

```html
<!-- 使用 span + onclick -->
<span class="wb-badge wb-badge-ai" onclick="showAIFeatures()">
  <i class="fa-solid fa-sparkles"></i>
  <span>AI</span>
</span>
```

#### 迁移后

```html
<!-- 使用 button -->
<button class="wb-badge wb-badge-ai" 
        aria-label="人工智能功能，点击了解更多"
        type="button"
        onclick="showAIFeatures()">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</button>
```

### 场景 5: 自定义样式

#### 迁移前

```css
/* 直接使用颜色值 */
.custom-page .wb-badge {
  background: linear-gradient(135deg, #ec4899, #f43f5e);
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.15);
}

.custom-page .wb-title {
  color: #1e293b;
}
```

#### 迁移后

```css
/* 使用 CSS 变量 */
.custom-page .wb-badge {
  --badge-gradient: linear-gradient(135deg, #ec4899, #f43f5e);
  --badge-shadow: 0 2px 8px rgba(236, 72, 153, 0.15);
}

.custom-page .wb-container {
  --wb-text-primary: #1e293b;
}

/* 添加暗色模式支持 */
@media (prefers-color-scheme: dark) {
  .custom-page .wb-badge {
    --badge-gradient: linear-gradient(135deg, #f472b6, #fb7185);
  }

  .custom-page .wb-container {
    --wb-text-primary: #f1f5f9;
  }
}
```

### 场景 6: 响应式断点

#### 迁移前

```css
/* 旧断点 */
@media (max-width: 800px) {
  .custom-page .wb-content {
    padding: 1rem;
  }
}

@media (max-width: 600px) {
  .custom-page .wb-badge {
    font-size: 0.5rem;
  }
}
```

#### 迁移后

```css
/* 新断点 */
@media (max-width: 768px) {
  .custom-page .wb-content {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .custom-page .wb-badge {
    font-size: 0.5rem;
  }
}

/* 新增超小屏幕断点 */
@media (max-width: 375px) {
  .custom-page .wb-icon-main {
    width: 48px;
    height: 48px;
  }
}
```

### 手动迁移清单

- [ ] 为所有徽章添加主题类
- [ ] 为所有徽章添加 `aria-label` 属性
- [ ] 为所有图标添加 `aria-hidden="true"` 属性
- [ ] 将 div 标签改为语义化标签（ul/li, button）
- [ ] 将可点击徽章改为 button 标签
- [ ] 将自定义样式改为使用 CSS 变量
- [ ] 添加暗色模式支持
- [ ] 调整响应式断点

---

## 验证和测试

迁移完成后，需要进行全面的验证和测试。

### 自动化验证

#### 1. 运行验证脚本

```bash
# 运行验证脚本
python3 scripts/validate-welcome-banner.py \
  --dir src/modules \
  --output post-migration-report.json \
  --verbose

# 检查是否有问题
cat post-migration-report.json | grep -i "error\|warning"
```

#### 2. 对比迁移前后

```bash
# 对比迁移前后的报告
diff pre-migration-report.json post-migration-report.json

# 或使用 jq 工具对比
jq '.violations' pre-migration-report.json > pre-violations.json
jq '.violations' post-migration-report.json > post-violations.json
diff pre-violations.json post-violations.json
```

### 浏览器测试

#### 1. 视觉测试

在浏览器中打开所有页面，检查：

- [ ] 徽章主题颜色是否正确
- [ ] 动画是否流畅（脉冲、闪烁）
- [ ] 暗色模式是否适配
- [ ] 响应式布局是否正确
- [ ] 文字是否清晰可读
- [ ] 触摸目标是否足够大
- [ ] 无水平滚动条

**测试设备**：
- 桌面：Chrome、Firefox、Safari、Edge
- 平板：iPad、Android 平板
- 移动端：iPhone、Android 手机

#### 2. 功能测试

测试交互功能：

- [ ] 可点击元素可以点击
- [ ] 键盘导航正常工作（Tab、Enter、Space）
- [ ] 焦点样式可见
- [ ] 悬停效果正常
- [ ] 动画可以禁用（prefers-reduced-motion）

#### 3. 无障碍测试

使用屏幕阅读器测试：

**macOS (VoiceOver)**：
```bash
# 启用 VoiceOver
Cmd + F5

# 测试要点：
# - 徽章是否被正确读取
# - 装饰性图标是否被忽略
# - 标题层级是否正确
# - 列表是否被识别
```

**Windows (NVDA)**：
```bash
# 下载并安装 NVDA
# https://www.nvaccess.org/

# 测试要点：
# - 徽章是否被正确读取
# - 装饰性图标是否被忽略
# - 标题层级是否正确
# - 列表是否被识别
```

#### 4. 性能测试

使用浏览器开发者工具测试性能：

**Chrome DevTools**：
```bash
# 1. 打开 DevTools (F12)
# 2. 切换到 Performance 面板
# 3. 点击录制按钮
# 4. 刷新页面
# 5. 停止录制
# 6. 查看性能指标：
#    - First Contentful Paint (FCP): < 1.8s
#    - Largest Contentful Paint (LCP): < 2.5s
#    - Total Blocking Time (TBT): < 200ms
#    - Cumulative Layout Shift (CLS): < 0.1
```

**Lighthouse**：
```bash
# 运行 Lighthouse 测试
npx lighthouse https://your-site.com --view

# 关注以下分数：
# - Performance: ≥ 90
# - Accessibility: ≥ 90
# - Best Practices: ≥ 90
```

### 测试清单

#### 自动化测试
- [ ] 运行验证脚本
- [ ] 对比迁移前后报告
- [ ] 运行 Lighthouse 测试
- [ ] 运行 axe DevTools 测试

#### 浏览器测试
- [ ] 桌面浏览器测试（Chrome、Firefox、Safari、Edge）
- [ ] 平板测试（iPad、Android 平板）
- [ ] 移动端测试（iPhone、Android 手机）
- [ ] 暗色模式测试
- [ ] 响应式布局测试

#### 功能测试
- [ ] 可点击元素测试
- [ ] 键盘导航测试
- [ ] 焦点样式测试
- [ ] 悬停效果测试
- [ ] 动画测试

#### 无障碍测试
- [ ] 屏幕阅读器测试（VoiceOver、NVDA）
- [ ] 对比度测试
- [ ] 键盘导航测试
- [ ] ARIA 属性测试

#### 性能测试
- [ ] 首次渲染时间测试
- [ ] 动画帧率测试
- [ ] Lighthouse 性能测试
- [ ] 文件大小测试

---

## 回滚方案

如果迁移过程中出现问题，可以使用以下方法回滚。

### 方法 1: 使用备份文件

如果使用了 `--backup` 选项，迁移工具会创建 `.bak` 后缀的备份文件：

```bash
# 查找所有备份文件
find src/modules -name "*.bak"

# 恢复单个文件
cp src/modules/app_center/views/qalab/template.html.bak \
   src/modules/app_center/views/qalab/template.html

# 批量恢复所有文件
find src/modules -name "*.bak" | while read backup; do
  original="${backup%.bak}"
  cp "$backup" "$original"
  echo "恢复: $original"
done

# 删除备份文件
find src/modules -name "*.bak" -delete
```

### 方法 2: 使用 Git 回滚

如果使用了 Git 版本控制：

```bash
# 查看变更
git status
git diff

# 回滚所有变更
git checkout .

# 或回滚特定文件
git checkout src/modules/app_center/views/qalab/template.html

# 或回滚到特定提交
git log --oneline
git reset --hard <commit-hash>
```

### 方法 3: 使用目录备份

如果在迁移前备份了整个目录：

```bash
# 删除当前目录
rm -rf src/modules

# 恢复备份目录
cp -r src/modules.backup src/modules

# 验证恢复
ls -la src/modules
```

### 回滚后验证

```bash
# 运行验证脚本
python3 scripts/validate-welcome-banner.py \
  --dir src/modules \
  --output rollback-report.json

# 对比回滚前后
diff pre-migration-report.json rollback-report.json

# 在浏览器中测试
# 确认页面恢复到迁移前的状态
```

---

## 常见问题

### Q1: 迁移工具报错 "No module named 'bs4'"

**原因**：缺少 BeautifulSoup4 依赖

**解决方法**：
```bash
pip3 install beautifulsoup4 lxml
```

### Q2: 迁移后徽章主题不生效

**原因**：CSS 文件未更新或缓存问题

**解决方法**：
```bash
# 1. 确认 CSS 文件已更新
grep -n "wb-badge-ai" src/css/components/welcome-banner.css

# 2. 清除浏览器缓存
# Chrome: Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac)

# 3. 检查 CSS 文件是否正确引入
grep -rn "welcome-banner.css" src/
```

### Q3: 暗色模式不适配

**原因**：浏览器不支持或系统未启用暗色模式

**解决方法**：
```bash
# 1. 检查浏览器支持
# Chrome 76+, Firefox 67+, Safari 12.1+, Edge 79+

# 2. 启用系统暗色模式
# macOS: 系统偏好设置 → 通用 → 外观 → 深色
# Windows: 设置 → 个性化 → 颜色 → 深色

# 3. 使用 DevTools 模拟
# Chrome DevTools → Cmd+Shift+P → "Emulate CSS prefers-color-scheme: dark"
```

### Q4: 动画卡顿

**原因**：动画元素过多或设备性能不足

**解决方法**：
```css
/* 在移动端隐藏装饰元素 */
@media (max-width: 768px) {
  .wb-orb,
  .wb-particle,
  .wb-grid-pattern {
    display: none;
  }
}

/* 或禁用特定页面的动画 */
.low-performance-page .wb-orb,
.low-performance-page .wb-particle {
  animation: none;
  display: none;
}
```

### Q5: 响应式布局错乱

**原因**：自定义样式与新版本冲突

**解决方法**：
```bash
# 1. 检查自定义样式
grep -r "wb-" src/css/pages/
grep -r "wb-" src/css/custom/

# 2. 调整自定义样式以适配新版本
# 使用 CSS 变量而非直接设置属性

# 3. 使用浏览器 DevTools 调试
# 检查元素的 computed styles
# 查找被覆盖的样式
```

### Q6: 屏幕阅读器无法读取徽章

**原因**：缺少 `aria-label` 属性或使用了错误的标签

**解决方法**：
```html
<!-- 确保添加 aria-label -->
<span class="wb-badge wb-badge-ai" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>

<!-- 确保装饰性图标添加 aria-hidden -->
<i class="fa-solid fa-sparkles" aria-hidden="true"></i>
```

### Q7: 迁移后文件大小增加

**原因**：添加了 ARIA 属性和徽章主题类

**解决方法**：
```bash
# 1. 压缩 HTML 文件（生产环境）
# 使用构建工具（Webpack、Vite）自动压缩

# 2. 启用 Gzip 压缩（服务器端）
# Nginx:
gzip on;
gzip_types text/html text/css application/javascript;

# Apache:
AddOutputFilterByType DEFLATE text/html text/css application/javascript
```

### Q8: 自定义动画与新版本冲突

**原因**：动画名称相同

**解决方法**：
```css
/* 重命名自定义动画 */
@keyframes customPulse {
  /* ... */
}

.custom-page .wb-badge {
  animation: customPulse 2s ease-in-out infinite;
}
```

---

## 总结

本迁移指南提供了从旧版本升级到优化版本的完整流程：

1. **升级前准备**：备份文件、检查版本、运行验证脚本
2. **升级步骤**：更新 CSS、运行迁移工具、手动调整、验证测试
3. **破坏性变更**：CSS 变量、动画、响应式断点、暗色模式
4. **自动化迁移**：使用迁移工具自动添加徽章主题类和 ARIA 属性
5. **手动迁移**：处理自动化工具无法处理的情况
6. **验证和测试**：自动化验证、浏览器测试、无障碍测试、性能测试
7. **回滚方案**：使用备份文件、Git 回滚、目录备份
8. **常见问题**：解决迁移过程中可能遇到的问题

遵循本指南，您可以顺利完成 Welcome Banner 组件的迁移，享受优化版本带来的改进。

如需更多帮助，请参考：
- [使用指南](./welcome-banner-usage-guide.md)
- [故障排查指南](./welcome-banner-troubleshooting.md)
- [最佳实践指南](./welcome-banner-best-practices.md)
