# 系统级页面淡入动画

## 概述

已在系统框架层实现通用的页面加载淡入动画,所有通过 `loadTemplate()` 加载的页面都会自动应用优雅的淡入效果。

## 实现位置

### 1. 全局CSS样式 (`src/css/style.css`)

```css
/* 系统级页面加载淡入动画 */
@keyframes pageViewFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.view-fade-in {
  animation: pageViewFadeIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.view-fade-in-initial {
  opacity: 0;
}
```

### 2. 视图加载器 (`src/common/utils/viewLoader.ts`)

在 `loadTemplate()` 函数中自动包裹动画容器:

```typescript
// 自动包裹淡入动画容器（系统级通用功能）
if (!options?.disableFadeIn) {
    html = `<div class="view-fade-in-initial view-fade-in">${html}</div>`;
}
```

## 动画效果

- **动画时长**: 0.5秒
- **缓动函数**: `cubic-bezier(0.22, 1, 0.36, 1)` (平滑自然)
- **动画效果**: 从下方12px淡入,透明度从0到1
- **初始状态**: 透明(避免闪烁)

## 使用方式

### 默认行为(自动启用)

所有页面默认自动应用淡入动画,无需任何额外代码:

```typescript
// 自动应用淡入动画
const html = await loadTemplate('src/modules/xxx/template.html');
container.innerHTML = html;
```

### 禁用动画(可选)

如果某些特殊场景需要禁用动画:

```typescript
// 明确禁用淡入动画
const html = await loadTemplate('src/modules/xxx/template.html', { 
    disableFadeIn: true 
});
container.innerHTML = html;
```

## 受益页面

以下所有页面都会自动应用淡入动画:

- ✅ 数据采集 (Scraper)
- ✅ Q&A预研 (AI Analysis)
- ✅ Prompt生成 (Promptlab)
- ✅ QA实验室 (QALab)
- ✅ 关键词猎手 (Keyword Hunter)
- ✅ 所有SOPs页面
- ✅ 所有App Center子页面
- ✅ 所有其他模块页面

## 技术优势

1. **零侵入**: 无需修改任何现有页面代码
2. **统一体验**: 所有页面保持一致的加载动画
3. **性能优化**: 使用CSS动画,GPU加速
4. **灵活控制**: 支持按需禁用
5. **易于维护**: 集中管理,统一调整

## 参考示例

参考"数据采集"和"Q&A预研"页面的淡入效果,现在所有页面都具有相同的优雅加载体验。
