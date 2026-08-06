# Requirements Document

## Introduction

本文档定义了 Master Prompt AI 分析页面报告展示区域的 UX 优化需求。该功能是 Master Prompt 模块的核心部分,用户在点击"开始分析"后,AI 会生成结构化的分析报告,以可拖拽、可调整大小的卡片形式展示。当前实现使用 GridStack 库,但存在多个用户体验问题需要优化。

## Glossary

- **Report_Display_Area**: 报告展示区域,包含所有分析结果卡片的容器
- **Widget_Card**: 单个分析维度的卡片组件,可拖拽和调整大小
- **GridStack**: 第三方库,用于实现可拖拽和可调整大小的网格布局
- **Analysis_Module**: 分析模块配置,定义了分析的维度(如痛点分析、卖点洞察等)
- **Edit_Mode**: 编辑模式,允许用户修改报告内容
- **View_Mode**: 查看模式,只读展示报告内容
- **Translation_Mode**: 翻译模式,展示报告的中文翻译版本
- **Toolbar**: 工具栏,包含翻译、导出、复制等操作按钮
- **Empty_State**: 空状态,当没有报告数据时的展示界面
- **Loading_State**: 加载状态,AI 分析过程中的骨架屏展示

## Requirements

### Requirement 1: 卡片布局优化

**User Story:** 作为用户,我希望报告卡片的布局清晰合理,以便快速浏览和理解分析结果。

#### Acceptance Criteria

1. WHEN 报告生成完成 THEN THE Report_Display_Area SHALL 使用响应式网格布局展示所有 Widget_Card
2. WHEN 用户查看报告 THEN THE Widget_Card SHALL 根据内容类型自动调整初始高度
3. WHEN 屏幕尺寸改变 THEN THE Report_Display_Area SHALL 自动重新排列 Widget_Card 以适应新的视口宽度
4. WHEN 多个 Widget_Card 同时展示 THEN THE Report_Display_Area SHALL 保持卡片之间的间距一致
5. THE Widget_Card SHALL 在视觉上区分不同的分析维度类别(listing、reviews、cross)

### Requirement 2: 卡片交互优化

**User Story:** 作为用户,我希望卡片的交互方式直观易用,以便根据需要调整布局和编辑内容。

#### Acceptance Criteria

1. WHEN 用户悬停在 Widget_Card 标题栏 THEN THE Widget_Card SHALL 显示拖拽手柄和操作按钮
2. WHEN 用户拖拽 Widget_Card THEN THE System SHALL 提供视觉反馈显示拖拽状态
3. WHEN 用户点击调整大小按钮 THEN THE Widget_Card SHALL 切换可调整大小状态
4. WHEN 用户点击编辑按钮 THEN THE Widget_Card SHALL 从 View_Mode 切换到 Edit_Mode
5. WHEN 用户在 Translation_Mode THEN THE System SHALL 禁用编辑功能并显示禁用原因
6. WHEN 用户完成编辑 THEN THE Widget_Card SHALL 平滑过渡回 View_Mode

### Requirement 3: 数据展示优化

**User Story:** 作为用户,我希望不同类型的数据以清晰易读的方式展示,以便快速理解分析结果。

#### Acceptance Criteria

1. WHEN Widget_Card 包含字符串数据 THEN THE System SHALL 使用可读的文本格式展示
2. WHEN Widget_Card 包含字符串数组 THEN THE System SHALL 使用标签或列表形式展示
3. WHEN Widget_Card 包含对象数组 THEN THE System SHALL 使用结构化卡片形式展示每个对象
4. WHEN Widget_Card 包含路径类型数据 THEN THE System SHALL 使用面包屑导航样式展示
5. WHEN Widget_Card 数据为空 THEN THE System SHALL 显示友好的空状态提示
6. WHEN 数据内容过长 THEN THE Widget_Card SHALL 提供滚动功能

### Requirement 4: 工具栏功能优化

**User Story:** 作为用户,我希望工具栏的功能布局合理,以便快速访问常用操作。

#### Acceptance Criteria

1. WHEN 报告生成完成 THEN THE Toolbar SHALL 显示在报告顶部并保持可见
2. WHEN 用户滚动页面 THEN THE Toolbar SHALL 保持固定在视口顶部
3. WHEN 用户点击翻译按钮 THEN THE System SHALL 显示翻译进度并在完成后切换到 Translation_Mode
4. WHEN 用户在 Translation_Mode THEN THE Toolbar SHALL 禁用与原文相关的操作(如复制 Markdown)
5. WHEN 用户点击导出按钮 THEN THE System SHALL 下载 JSON 格式的报告文件
6. WHEN 用户点击复制 Markdown 按钮 THEN THE System SHALL 将报告内容复制到剪贴板
7. THE Toolbar SHALL 显示报告的元信息(生成时间、模型、目标市场)

### Requirement 5: 翻译功能交互优化

**User Story:** 作为用户,我希望翻译功能的交互流程流畅,以便在原文和译文之间快速切换。

#### Acceptance Criteria

1. WHEN 用户选择翻译模型 THEN THE System SHALL 启用翻译按钮
2. WHEN 用户点击翻译按钮 THEN THE System SHALL 显示翻译进度并逐个翻译 Widget_Card
3. WHEN 翻译完成 THEN THE System SHALL 自动切换到 Translation_Mode
4. WHEN 用户切换语言开关 THEN THE System SHALL 在原文和译文之间平滑切换
5. WHEN 翻译失败 THEN THE System SHALL 显示错误提示并保持在原文模式
6. WHEN 用户重新生成报告 THEN THE System SHALL 清除之前的翻译结果

### Requirement 6: 编辑模式用户体验优化

**User Story:** 作为用户,我希望编辑模式的用户体验友好,以便轻松修改报告内容。

#### Acceptance Criteria

1. WHEN 用户进入 Edit_Mode THEN THE Widget_Card SHALL 显示适合数据类型的编辑器
2. WHEN 用户编辑字符串数据 THEN THE System SHALL 提供自动调整高度的文本框
3. WHEN 用户编辑数组数据 THEN THE System SHALL 提供添加和删除条目的按钮
4. WHEN 用户编辑对象数组 THEN THE System SHALL 提供结构化的表单编辑器
5. WHEN 用户点击撤销按钮 THEN THE System SHALL 恢复到上一个编辑快照
6. WHEN 用户点击完成按钮 THEN THE System SHALL 保存修改并退出 Edit_Mode
7. WHEN 用户修改内容 THEN THE System SHALL 自动创建编辑快照以支持撤销

### Requirement 7: 空状态和加载状态优化

**User Story:** 作为用户,我希望空状态和加载状态的展示清晰友好,以便了解系统当前状态。

#### Acceptance Criteria

1. WHEN 用户首次进入分析页面 THEN THE System SHALL 显示欢迎横幅和操作指引
2. WHEN 用户未选择 ASIN THEN THE System SHALL 显示空状态提示
3. WHEN AI 正在分析 THEN THE System SHALL 显示骨架屏加载状态
4. WHEN 分析失败 THEN THE System SHALL 显示错误信息和重试建议
5. WHEN Widget_Card 数据为空 THEN THE System SHALL 显示友好的空状态图标和文字
6. THE Empty_State SHALL 提供视觉引导帮助用户理解下一步操作

### Requirement 8: 响应式设计

**User Story:** 作为用户,我希望报告展示区域在不同设备上都能良好展示,以便在任何设备上查看分析结果。

#### Acceptance Criteria

1. WHEN 用户在桌面设备查看 THEN THE Report_Display_Area SHALL 使用多列网格布局
2. WHEN 用户在平板设备查看 THEN THE Report_Display_Area SHALL 自动调整为两列布局
3. WHEN 用户在移动设备查看 THEN THE Report_Display_Area SHALL 使用单列布局
4. WHEN 屏幕宽度小于 768px THEN THE Toolbar SHALL 调整为垂直堆叠布局
5. WHEN 用户在移动设备 THEN THE System SHALL 禁用拖拽功能但保留其他交互

### Requirement 9: 性能优化

**User Story:** 作为用户,我希望报告展示区域响应迅速,以便流畅地浏览和操作大量数据。

#### Acceptance Criteria

1. WHEN 报告包含超过 10 个 Widget_Card THEN THE System SHALL 在 500ms 内完成渲染
2. WHEN 用户拖拽 Widget_Card THEN THE System SHALL 保持 60fps 的流畅度
3. WHEN 用户切换 View_Mode 和 Edit_Mode THEN THE System SHALL 在 200ms 内完成切换
4. WHEN 用户切换语言 THEN THE System SHALL 在 300ms 内完成内容替换
5. THE System SHALL 使用虚拟滚动优化长列表数据的渲染

### Requirement 10: 可访问性

**User Story:** 作为使用辅助技术的用户,我希望报告展示区域具有良好的可访问性,以便使用屏幕阅读器等工具。

#### Acceptance Criteria

1. THE Widget_Card SHALL 包含适当的 ARIA 标签和角色
2. WHEN 用户使用键盘导航 THEN THE System SHALL 提供清晰的焦点指示
3. THE Toolbar 按钮 SHALL 包含描述性的 title 属性
4. WHEN 用户使用屏幕阅读器 THEN THE System SHALL 提供有意义的文本描述
5. THE System SHALL 确保颜色对比度符合 WCAG AA 标准
