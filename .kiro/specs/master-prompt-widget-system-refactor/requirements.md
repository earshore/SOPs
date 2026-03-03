# Requirements Document

## Introduction

本文档定义了 Master Prompt 分析报告模块的 Widget 系统重构需求。当前系统使用 GridStack 实现可拖拽的卡片布局,但存在严重的稳定性和可维护性问题。本次重构旨在引入成熟稳定的外部方案,实现可靠的卡片布局管理系统。

## Glossary

- **Widget**: 分析报告中的单个卡片组件,展示特定维度的分析结果
- **Grid_System**: 网格布局系统,负责管理 Widget 的位置、大小和拖拽行为
- **Layout_Config**: 布局配置数据,记录每个 Widget 的位置、尺寸等信息
- **View_Mode**: 查看模式,用户可以查看和拖拽 Widget,但不能编辑内容
- **Edit_Mode**: 编辑模式,用户可以内联编辑 Widget 的内容
- **Persistence_Layer**: 持久化层,负责保存和恢复用户的布局配置
- **Analysis_Module**: 分析模块,定义了一个特定的分析维度(如关键词、产品特点等)
- **Responsive_Layout**: 响应式布局,根据屏幕尺寸自动调整 Widget 的排列方式

## Requirements

### Requirement 1: Widget 卡片渲染

**User Story:** 作为用户,我希望分析报告以模块化卡片的形式展示,以便清晰地查看每个分析维度的结果。

#### Acceptance Criteria

1. WHEN 分析报告生成完成 THEN THE Grid_System SHALL 为每个 Analysis_Module 创建一个独立的 Widget
2. WHEN 渲染 Widget THEN THE Grid_System SHALL 显示卡片标题、图标、内容区域和操作按钮
3. WHEN Widget 内容为加载状态 THEN THE Grid_System SHALL 显示骨架屏动画
4. WHEN Widget 内容加载完成 THEN THE Grid_System SHALL 根据数据类型(字符串、数组、对象)渲染相应的视觉样式
5. THE Grid_System SHALL 为不同类别的 Widget 应用不同的主题颜色(listing=蓝色, reviews=琥珀色, cross=紫色)

### Requirement 2: Widget 拖拽功能

**User Story:** 作为用户,我希望能够拖拽 Widget 调整位置,以便按照我的偏好组织报告布局。

#### Acceptance Criteria

1. WHEN 用户在 View_Mode 下拖拽 Widget THEN THE Grid_System SHALL 实时更新 Widget 位置
2. WHEN 拖拽 Widget 时 THEN THE Grid_System SHALL 显示拖拽手柄和视觉反馈
3. WHEN 释放 Widget THEN THE Grid_System SHALL 自动对齐到网格
4. WHEN 拖拽导致布局冲突 THEN THE Grid_System SHALL 自动调整其他 Widget 的位置以避免重叠
5. WHEN 用户在 Edit_Mode 下 THEN THE Grid_System SHALL 禁用拖拽功能

### Requirement 3: Widget 尺寸调整

**User Story:** 作为用户,我希望能够调整 Widget 的大小,以便为重要内容分配更多空间。

#### Acceptance Criteria

1. WHEN 用户悬停在 Widget 边缘 THEN THE Grid_System SHALL 显示调整大小手柄
2. WHEN 用户拖拽调整手柄 THEN THE Grid_System SHALL 实时更新 Widget 尺寸
3. WHEN 调整 Widget 尺寸 THEN THE Grid_System SHALL 限制最小尺寸为 2x2 网格单元
4. WHEN 调整 Widget 尺寸导致布局冲突 THEN THE Grid_System SHALL 自动调整其他 Widget 的位置
5. WHEN 用户在 Edit_Mode 下 THEN THE Grid_System SHALL 禁用尺寸调整功能

### Requirement 4: 布局持久化

**User Story:** 作为用户,我希望系统能够记住我的布局配置,以便下次打开时保持相同的布局。

#### Acceptance Criteria

1. WHEN 用户拖拽或调整 Widget THEN THE Persistence_Layer SHALL 在操作完成后 500ms 自动保存布局配置
2. WHEN 保存布局配置 THEN THE Persistence_Layer SHALL 记录每个 Widget 的 x、y、width、height 属性
3. WHEN 用户重新打开分析报告 THEN THE Grid_System SHALL 从 Persistence_Layer 加载上次保存的布局配置
4. WHEN 布局配置不存在或损坏 THEN THE Grid_System SHALL 使用默认布局(按顺序排列)
5. WHEN 新增或删除 Analysis_Module THEN THE Grid_System SHALL 智能合并新旧布局配置

### Requirement 5: 响应式布局

**User Story:** 作为用户,我希望在不同屏幕尺寸下都能获得良好的浏览体验,以便在各种设备上使用。

#### Acceptance Criteria

1. WHEN 屏幕宽度 >= 1280px THEN THE Grid_System SHALL 使用 12 列网格布局
2. WHEN 屏幕宽度在 768px - 1279px 之间 THEN THE Grid_System SHALL 使用 6 列网格布局
3. WHEN 屏幕宽度 < 768px THEN THE Grid_System SHALL 使用单列布局
4. WHEN 切换屏幕尺寸 THEN THE Grid_System SHALL 平滑过渡到新的布局模式
5. WHEN 在移动设备上 THEN THE Grid_System SHALL 禁用拖拽和调整大小功能

### Requirement 6: 编辑模式集成

**User Story:** 作为用户,我希望能够内联编辑 Widget 内容,以便快速修正或优化分析结果。

#### Acceptance Criteria

1. WHEN 用户点击 Widget 的编辑按钮 THEN THE Grid_System SHALL 切换该 Widget 到 Edit_Mode
2. WHEN Widget 处于 Edit_Mode THEN THE Grid_System SHALL 禁用该 Widget 的拖拽和调整大小功能
3. WHEN Widget 处于 Edit_Mode THEN THE Grid_System SHALL 显示编辑表单和保存/撤销按钮
4. WHEN 用户保存编辑 THEN THE Grid_System SHALL 切换回 View_Mode 并更新内容
5. WHEN 用户撤销编辑 THEN THE Grid_System SHALL 恢复原始内容并切换回 View_Mode

### Requirement 7: 视觉设计一致性

**User Story:** 作为用户,我希望 Widget 系统的视觉风格与整体系统保持一致,以便获得统一的用户体验。

#### Acceptance Criteria

1. THE Grid_System SHALL 使用 Tailwind CSS 实用类进行样式定义
2. THE Grid_System SHALL 使用系统定义的颜色方案(slate、blue、amber、violet)
3. THE Grid_System SHALL 使用圆角、阴影、渐变等现代化视觉效果
4. THE Grid_System SHALL 在交互时提供平滑的过渡动画(duration-200 ~ duration-300)
5. THE Grid_System SHALL 使用 Font Awesome 图标库

### Requirement 8: 性能优化

**User Story:** 作为用户,我希望系统能够流畅地处理多个 Widget,以便快速浏览和操作报告。

#### Acceptance Criteria

1. WHEN 渲染 10+ 个 Widget THEN THE Grid_System SHALL 在 1 秒内完成初始渲染
2. WHEN 拖拽 Widget THEN THE Grid_System SHALL 保持 60fps 的流畅度
3. WHEN 调整 Widget 尺寸 THEN THE Grid_System SHALL 使用防抖优化布局计算
4. WHEN 保存布局配置 THEN THE Grid_System SHALL 使用节流避免频繁写入存储
5. WHEN 销毁 Grid_System THEN THE Grid_System SHALL 清理所有事件监听器和 DOM 引用

### Requirement 9: 错误处理

**User Story:** 作为用户,我希望系统能够优雅地处理错误情况,以便在出现问题时获得清晰的反馈。

#### Acceptance Criteria

1. WHEN Grid_System 初始化失败 THEN THE Grid_System SHALL 抛出明确的错误信息并记录日志
2. WHEN 布局配置加载失败 THEN THE Grid_System SHALL 使用默认布局并显示警告提示
3. WHEN Widget 渲染失败 THEN THE Grid_System SHALL 显示错误占位符并继续渲染其他 Widget
4. WHEN 拖拽或调整大小操作失败 THEN THE Grid_System SHALL 恢复到操作前的状态
5. WHEN 保存布局配置失败 THEN THE Grid_System SHALL 在控制台记录警告但不阻塞用户操作

### Requirement 10: 外部库选型

**User Story:** 作为开发者,我希望使用成熟稳定的外部库,以便减少维护成本并获得社区支持。

#### Acceptance Criteria

1. THE Grid_System SHALL 基于成熟的开源网格布局库实现
2. THE 选择的库 SHALL 支持 TypeScript 类型定义
3. THE 选择的库 SHALL 有活跃的维护(最近 6 个月内有更新)
4. THE 选择的库 SHALL 有完善的文档和示例
5. THE 选择的库 SHALL 支持 Vanilla JavaScript 或易于集成到现有项目
