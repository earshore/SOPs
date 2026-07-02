# CSS 模块分析报告

> 生成时间: 2026/7/3 02:02:06

## 📊 统计信息

- 分析文件数: 10
- 总代码行数: 7353
- 识别模式数: 8

## 🔍 发现的重复模式

### Cards 相关

- **cards-pattern-1**: 出现 9 次
  - 文件: src/modules/sops/sops_style.css, src/modules/amz_hub/amz_hub_style.css, src/modules/more/more_style.css, src/modules/app_center/views/master_analysis/scraper/scraper_style.css, src/modules/app_center/views/master_analysis/master_analysis_style.css, src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css, src/modules/more/views/explore/prompts/prompts_style.css
  - 示例:
    ```css
    .sop-card { background: var(--surface-card, #ffffff); border-radius: var(--radius-card, 8px);...
    ```
    ```css
    .amz_card-hover { position: relative; background: white; transition: all var(--duration-slow) var(--...
    ```

- **cards-pattern-3**: 出现 9 次
  - 文件: src/modules/sops/sops_style.css, src/modules/amz_hub/amz_hub_style.css, src/modules/more/more_style.css, src/modules/app_center/views/master_analysis/scraper/scraper_style.css, src/modules/app_center/views/master_analysis/master_analysis_style.css, src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css
  - 示例:
    ```css
    .sop-card { background: var(--surface-card, #ffffff); border-radius: var(--radius-card, 8px); border...
    ```
    ```css
    .glass-card { background: var(--color-white); backdrop-filter: blur(16px); /* 更深度的模糊 */ border: 1px ...
    ```

- **cards-pattern-2**: 出现 3 次
  - 文件: src/modules/amz_hub/amz_hub_style.css, src/modules/app_center/views/master_analysis/ai_analysis/ai_analysis_style.css, src/modules/more/views/explore/prompts/prompts_style.css
  - 示例:
    ```css
    .amz_card-hover:hover { transform: translateY(-4px)...
    ```
    ```css
    .card-hover:hover { transform: translateY(-4px)...
    ```

### Buttons 相关

- **buttons-pattern-1**: 出现 4 次
  - 文件: src/modules/app_center/app_center_style.css, src/modules/amz_hub/amz_hub_style.css, src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css, src/modules/more/views/explore/prompts/prompts_style.css
  - 示例:
    ```css
    .category-filter-btn { display: inline-flex; align-items: center; gap: 0.5rem; min-height: 2.5rem; p...
    ```
    ```css
    .amz_nav-btn { padding: 8px 20px; border-radius: 99px;...
    ```

### Animations 相关

- **animations-pattern-2**: 出现 17 次
  - 文件: src/modules/home/homeDisplay.css, src/modules/app_center/views/master_analysis/ai_analysis/ai_analysis_style.css, src/modules/app_center/views/master_analysis/scraper/scraper_style.css, src/modules/app_center/views/keyword_hunter/keyword_hunter_style.css
  - 示例:
    ```css
    animation: fadeUp 1s...
    ```
    ```css
    animation: fadeUp 1s...
    ```

### Icons 相关

### Badges 相关

## 💡 优化建议

1. 发现 3 个重复的卡片样式模式，建议提取到 src/css/components/cards.css
2. 发现 1 个重复的动画定义，建议移动到 src/css/animations/keyframes.css

## 📝 下一步行动

### 立即执行

1. **提取通用容器样式**
   - 统一使用 `max-width: 1450px` 和 `margin: 0 auto`
   - 创建 `.module-container` 通用类

2. **提取时间线组件**
   - 创建 `src/css/components/timeline.css`
   - 统一时间线样式和动画

3. **整合图标容器**
   - 使用统一的 `.icon-container` 类
   - 支持不同尺寸变体

4. **合并重复动画**
   - 移动重复的 @keyframes 到全局动画文件
   - 使用设计令牌中的动画变量

### 后续优化

1. 重构模块特有样式
2. 更新模块CSS注册表
3. 建立代码审查清单
4. 编写最佳实践文档

---

**维护者**: AihangSOP 开发团队
