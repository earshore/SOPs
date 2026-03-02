# Welcome Banner 徽章快速参考

## 徽章主题速查表

| 主题类 | 颜色 | 文字示例 | 图标示例 | 使用场景 |
|--------|------|----------|----------|----------|
| `wb-badge-ai` | 🔵 蓝色 | AI, SMART | `fa-sparkles`, `fa-brain`, `fa-clipboard-question` | AI 智能功能 |
| `wb-badge-growth` | 🟢 绿色 | GROWTH, SEO, NPI | `fa-chart-line`, `fa-rocket`, `fa-seedling` | 增长运营 |
| `wb-badge-safety` | 🔴 红色 | SAFE, ALERT | `fa-shield-halved`, `fa-lock`, `fa-exclamation-triangle` | 安全合规 |
| `wb-badge-service` | 🟣 紫色 | SERVICE, SUPPORT | `fa-headset`, `fa-comments`, `fa-envelope` | 客服服务 |
| `wb-badge-supply` | 🟠 橙色 | SUPPLY, SHIP | `fa-boxes`, `fa-truck`, `fa-warehouse` | 后端供应链 |
| `wb-badge-analytics` | 🔵 青色 | DATA, ANALYZE | `fa-chart-bar`, `fa-magnifying-glass-chart`, `fa-database` | 数据分析 |
| `wb-badge-pro` | 🟡 琥珀色 | PRO, MASTER | `fa-flask`, `fa-wand-magic-sparkles`, `fa-gem` | 专业工具 |
| `wb-badge-hub` | ⚫ 灰色 | HUB, DOCS | `fa-star`, `fa-book`, `fa-grid` | 概览导航 |

## 使用方法

### 基础用法

```html
<span class="wb-badge wb-badge-growth">
  <i class="fa-solid fa-chart-line"></i>GROWTH
</span>
```

### 完整版 (带 .wb-card)

```html
<div class="wb-container">
  <div class="wb-card">
    <div class="wb-content">
      <div class="wb-header">
        <div class="wb-text">
          <div class="wb-title-row">
            <h2 class="wb-title">页面标题</h2>
            <span class="wb-badge wb-badge-ai">
              <i class="fa-solid fa-sparkles"></i>AI
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 简化版 (不带 .wb-card)

```html
<div class="wb-container">
  <div class="wb-content">
    <div class="wb-icon">
      <i class="fas fa-icon"></i>
    </div>
    <div class="wb-title-row">
      <h1 class="wb-title">页面标题</h1>
      <span class="wb-badge wb-badge-growth">
        <i class="fa-solid fa-chart-line"></i>GROWTH
      </span>
    </div>
  </div>
</div>
```

## 图标推荐

### AI 智能类
- `fa-sparkles` - 闪光 (通用 AI)
- `fa-brain` - 大脑 (智能分析)
- `fa-clipboard-question` - 问答 (Q&A)
- `fa-robot` - 机器人 (AI 助手)

### 增长运营类
- `fa-chart-line` - 增长曲线 (通用增长)
- `fa-rocket` - 火箭 (SEO 优化)
- `fa-seedling` - 幼苗 (新品培育)
- `fa-tags` - 标签 (促销活动)

### 安全合规类
- `fa-shield-halved` - 盾牌 (通用安全)
- `fa-lock` - 锁 (账号保护)
- `fa-exclamation-triangle` - 警告 (风险提示)
- `fa-certificate` - 证书 (合规认证)

### 客服服务类
- `fa-headset` - 耳机 (客服)
- `fa-comments` - 对话 (沟通)
- `fa-envelope` - 邮件 (邮件服务)
- `fa-user-tie` - 客服人员

### 后端供应链类
- `fa-boxes` - 箱子 (库存)
- `fa-truck` - 卡车 (物流)
- `fa-warehouse` - 仓库 (仓储)
- `fa-dolly` - 搬运 (配送)

### 数据分析类
- `fa-chart-bar` - 柱状图 (数据)
- `fa-magnifying-glass-chart` - 分析 (监控)
- `fa-database` - 数据库 (数据管理)
- `fa-chart-pie` - 饼图 (统计)

### 专业工具类
- `fa-flask` - 烧杯 (实验室)
- `fa-wand-magic-sparkles` - 魔杖 (魔法工具)
- `fa-gem` - 宝石 (高级功能)
- `fa-crown` - 皇冠 (专业版)

### 概览导航类
- `fa-star` - 星星 (中心)
- `fa-book` - 书籍 (文档)
- `fa-grid` - 网格 (更多)
- `fa-lightbulb` - 灯泡 (指南)

## 自定义主题

### 创建新主题

```css
.wb-badge-custom {
  --badge-gradient: linear-gradient(135deg, #起始色, #结束色);
  --badge-shadow: 0 2px 8px rgba(起始色RGB, 0.15);
}
```

### 示例: 粉色主题

```css
.wb-badge-pink {
  --badge-gradient: linear-gradient(135deg, #ec4899, #db2777);
  --badge-shadow: 0 2px 8px rgba(236, 72, 153, 0.15);
}
```

## 常见问题

### Q: 如何选择合适的主题？
A: 根据页面功能选择：
- AI 功能 → `wb-badge-ai`
- 运营增长 → `wb-badge-growth`
- 安全相关 → `wb-badge-safety`
- 客服相关 → `wb-badge-service`
- 供应链 → `wb-badge-supply`
- 数据分析 → `wb-badge-analytics`
- 高级工具 → `wb-badge-pro`
- 概览页面 → `wb-badge-hub`

### Q: 可以混用多个徽章吗？
A: 可以，但建议每个页面只使用一个主徽章，保持简洁。

### Q: 如何修改徽章文字？
A: 直接修改 HTML 中的文字内容，建议使用简短的英文大写。

### Q: 如何更换图标？
A: 修改 `<i>` 标签的 class，使用 FontAwesome 图标库。

### Q: 徽章不显示怎么办？
A: 检查：
1. 是否引入了 `main.css`
2. 是否添加了主题类 (如 `wb-badge-ai`)
3. 是否引入了 FontAwesome 图标库

## 批量更新工具

### 预览模式

```bash
python3 scripts/update-badge-themes.py --dry-run
```

### 实际应用

```bash
python3 scripts/update-badge-themes.py
```

## 测试页面

打开 `test/welcome-banner-badge-themes-test.html` 查看所有主题效果。

## 相关文档

- [设计方案](./welcome-banner-badge-design-proposal.md)
- [实施报告](./welcome-banner-badge-themes-implementation.md)
- [CSS 架构指南](./CSS-ARCHITECTURE-README.md)
