# Welcome Banner 配色快速参考指南

**适用对象**: 前端开发者、UI 设计师
**更新日期**: 2026-03-17

---

## 快速查找表

### 按模块类别选择配色

| 模块类别 | 配色方案 | CSS 变量 | 视觉效果 |
|---------|---------|---------|---------|
| **AI & 技术** | 天空蓝 | `rgba(239, 246, 255, 0.95)` → `rgba(219, 234, 254, 0.90)` | 专业、科技感 |
| **数据分析** | 青色 | `rgba(236, 254, 255, 0.95)` → `rgba(207, 250, 254, 0.90)` | 清新、明快 |
| **增长运营** | 翡翠绿 | `rgba(236, 253, 245, 0.95)` → `rgba(209, 250, 229, 0.90)` | 活力、成长 |
| **安全合规** | 柔和橙 | `rgba(255, 247, 237, 0.95)` → `rgba(255, 237, 213, 0.90)` | 警示、温和 |
| **客户服务** | 淡紫色 | `rgba(250, 245, 255, 0.95)` → `rgba(243, 232, 255, 0.90)` | 友好、温暖 |
| **供应链** | 琥珀金 | `rgba(255, 251, 235, 0.95)` → `rgba(254, 243, 199, 0.90)` | 稳重、专业 |
| **知识中心** | 石板灰 | `rgba(248, 250, 252, 0.95)` → `rgba(241, 245, 249, 0.90)` | 中性、权威 |
| **探索创新** | 靛蓝 | `rgba(238, 242, 255, 0.95)` → `rgba(224, 231, 255, 0.90)` | 探索、创意 |

---

## 使用方法

### 方法 1: 直接复制粘贴

```html
<!-- AI & 技术类 -->
<div class="wb-container" style="--wb-gradient-1: rgba(239, 246, 255, 0.95); --wb-gradient-2: rgba(219, 234, 254, 0.90);">
  <!-- 内容 -->
</div>

<!-- 增长运营类 -->
<div class="wb-container" style="--wb-gradient-1: rgba(236, 253, 245, 0.95); --wb-gradient-2: rgba(209, 250, 229, 0.90);">
  <!-- 内容 -->
</div>

<!-- 安全合规类 -->
<div class="wb-container" style="--wb-gradient-1: rgba(255, 247, 237, 0.95); --wb-gradient-2: rgba(255, 237, 213, 0.90);">
  <!-- 内容 -->
</div>
```

### 方法 2: 使用设计令牌

```typescript
// 从设计令牌导入
import { COLOR_PALETTES } from '@/common/config/design-tokens';

// AI & 技术类
const aiTechColors = {
  gradient1: COLOR_PALETTES.blue[50],    // #eff6ff
  gradient2: COLOR_PALETTES.blue[100]    // #dbeafe
};

// 增长运营类
const growthColors = {
  gradient1: COLOR_PALETTES.emerald[50],  // #ecfdf5
  gradient2: COLOR_PALETTES.emerald[100]  // #d1fae5
};
```

---

## 配色决策树

```
新建 Welcome Banner
    │
    ├─ 是否涉及 AI/LLM？
    │   └─ 是 → 使用「天空蓝」
    │
    ├─ 是否涉及数据分析？
    │   └─ 是 → 使用「青色」
    │
    ├─ 是否涉及增长/营销？
    │   └─ 是 → 使用「翡翠绿」
    │
    ├─ 是否涉及安全/合规？
    │   └─ 是 → 使用「柔和橙」
    │
    ├─ 是否涉及客户服务？
    │   └─ 是 → 使用「淡紫色」
    │
    ├─ 是否涉及供应链/后端？
    │   └─ 是 → 使用「琥珀金」
    │
    ├─ 是否为知识/文档类？
    │   └─ 是 → 使用「石板灰」
    │
    └─ 是否为探索/实验性功能？
        └─ 是 → 使用「靛蓝」
```

---

## 常见问题

### Q1: 为什么不能使用深色背景？
**A**: 深色背景会导致文字对比度不足，违反 WCAG 无障碍标准。浅色背景确保所有用户都能清晰阅读文字。

### Q2: 可以自定义配色吗？
**A**: 可以，但必须确保：
- 使用 50-200 色阶的浅色调
- 文字对比度 ≥ 4.5:1 (WCAG AA)
- 与现有设计系统保持一致

### Q3: 如何测试对比度？
**A**: 使用以下工具：
- Chrome DevTools: Lighthouse 审计
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- 浏览器插件: WAVE, axe DevTools

### Q4: 暗色模式怎么办？
**A**: `welcome-banner.css` 已包含暗色模式适配，会自动调整配色。

### Q5: 移动端需要特殊处理吗？
**A**: 不需要，响应式样式已内置，会自动适配移动端。

---

## 禁止使用的配色

以下配色已被证实存在可读性问题，**严禁使用**：

```css
/* ❌ 深红色 - 文字不可见 */
--wb-gradient-1: #ef4444;
--wb-gradient-2: #dc2626;

/* ❌ 深紫色 - 对比度不足 */
--wb-gradient-1: #9333ea;
--wb-gradient-2: #ec4899;

/* ❌ 深蓝色 - 文字模糊 */
--wb-gradient-1: #2563eb;
--wb-gradient-2: #1d4ed8;

/* ❌ 任何 500+ 色阶 - 太深 */
--wb-gradient-1: var(--color-*-500);
--wb-gradient-2: var(--color-*-600);
```

---

## 对比度检查清单

在提交代码前，请确认：

- [ ] 主标题 (#0f172a) 对比度 ≥ 4.5:1
- [ ] 描述文字 (#64748b) 对比度 ≥ 4.5:1
- [ ] 标签文字对比度 ≥ 4.5:1
- [ ] 在浅色和暗色模式下都清晰可读
- [ ] 在移动端和桌面端都显示正常

---

## 代码审查要点

审查 Welcome Banner 代码时，检查：

1. **配色是否符合类别**
   - AI 模块使用蓝色系 ✓
   - 安全模块使用橙色系 ✓
   - 不要混用配色 ✗

2. **CSS 变量格式正确**
   ```css
   /* ✓ 正确 */
   style="--wb-gradient-1: rgba(239, 246, 255, 0.95); --wb-gradient-2: rgba(219, 234, 254, 0.90);"

   /* ✗ 错误 - 使用了深色 */
   style="--wb-gradient-1: #3b82f6; --wb-gradient-2: #2563eb;"
   ```

3. **HTML 结构完整**
   - 包含 `.wb-container`
   - 包含 `.wb-card`（如果使用卡片布局）
   - 包含必要的装饰元素

4. **无障碍属性**
   - 图标有 `aria-label`
   - 标题使用语义化标签 `<h2>`
   - 列表使用 `<ul>` 和 `role="list"`

---

## 实用工具

### 自动化脚本
```bash
# 批量更新所有 welcome banner 配色
python scripts/update-welcome-colors.py

# 预览模式（不实际修改）
python scripts/update-welcome-colors.py --dry-run
```

### 设计令牌生成
```bash
# 重新生成设计令牌
npm run generate:tokens
```

### CSS 审计
```bash
# 审计 CSS 变量使用情况
npm run css:audit
```

---

## 相关资源

### 文档
- 完整设计方案: `.kiro/design/welcome-banner-color-scheme.md`
- 重构报告: `.kiro/design/welcome-banner-refactor-report.md`
- CSS 组件: `src/css/components/welcome-banner.css`

### 工具
- 更新脚本: `scripts/update-welcome-colors.py`
- 设计令牌: `src/common/config/design-tokens.ts`

### 标准
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Material Design Colors: https://material.io/design/color
- Tailwind CSS Palette: https://tailwindcss.com/docs/customizing-colors

---

## 联系方式

如有疑问，请联系：
- **设计团队**: Front Designer Team
- **技术支持**: Frontend Architecture Team
- **无障碍咨询**: Accessibility Testing Team

---

**最后更新**: 2026-03-17
**版本**: v1.0
