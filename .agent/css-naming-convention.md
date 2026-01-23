# CSS 命名规范

## BEM + 模块前缀

采用 **模块前缀 + BEM** 命名规范，避免样式冲突。

### 命名格式

```
.[module]-[block]__[element]--[modifier]
```

| 部分 | 说明 | 示例 |
|------|------|------|
| `module` | 模块前缀 | `sops-`, `hub-`, `mp-` |
| `block` | 独立组件 | `card`, `panel`, `list` |
| `element` | 组件的子元素 | `__header`, `__content`, `__footer` |
| `modifier` | 状态或变体 | `--active`, `--disabled`, `--large` |

### 模块前缀列表

| 模块 | 前缀 | 示例 |
|------|------|------|
| SOPs | `sops-` | `.sops-card`, `.sops-sidebar` |
| 智库 Hub | `hub-` | `.hub-panel`, `.hub-article` |
| Master Prompt | `mp-` | `.mp-scraper`, `.mp-analysis` |
| Keyword Tracker | `kw-` | `.kw-input`, `.kw-result` |
| 通用组件 | `ui-` | `.ui-modal`, `.ui-toast` |

### 示例

```css
/* SOPs 模块 */
.sops-card { }
.sops-card__header { }
.sops-card__content { }
.sops-card--expanded { }

/* Hub 模块 */
.hub-panel { }
.hub-panel__title { }
.hub-panel--loading { }
```

### 文件结构

```
src/modules/sops/
├── sops_style.css          # 模块级样式
└── views/growth/
    └── npi_tracker/
        └── npi_tracker.css # 视图级样式 (可选)
```

### 注意事项

1. **禁止裸标签选择器** - 不要用 `h1`, `p`, `button`
2. **禁止 ID 选择器** - 使用 class 代替
3. **层级不超过 3 层** - `.sops-card__header span` ❌
