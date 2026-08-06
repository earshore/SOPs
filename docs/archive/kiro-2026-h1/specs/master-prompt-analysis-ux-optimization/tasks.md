# Implementation Plan: Master Prompt Analysis UX Optimization

## Overview

本实现计划将 Master Prompt AI 分析页面报告展示区域的 UX 优化设计转换为可执行的编码任务。优化重点包括:布局管理、交互反馈、数据展示、编辑体验和响应式支持。

## Tasks

- [x] 1. 重构渲染层架构
  - 将现有的 renderer.ts 拆分为独立的渲染器类
  - 创建 ViewModeRenderer 和 EditModeRenderer 类
  - 实现数据类型检测和渲染器选择逻辑
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 1.1 为 ViewModeRenderer 编写属性测试
  - **Property 7: 数据类型渲染正确性**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ]* 1.2 为 ViewModeRenderer 编写单元测试
  - 测试空状态渲染
  - 测试超长文本处理
  - 测试特殊字符转义
  - _Requirements: 3.5_

- [ ] 2. 实现 GridManager 封装类
  - [x] 2.1 创建 GridManager 类封装 GridStack 逻辑
    - 实现 init、addWidget、removeWidget 方法
    - 实现 enableResize、disableResize、enableDrag 方法
    - 实现 saveLayout、loadLayout 方法
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 2.2 实现布局持久化功能
    - 使用 StorageService 保存/加载布局配置
    - 实现布局恢复逻辑
    - 添加错误处理和降级方案
    - _Requirements: 1.1_

  - [ ]* 2.3 为 GridManager 编写属性测试
    - **Property 1: 响应式网格布局一致性**
    - **Validates: Requirements 1.1, 1.3, 1.4, 8.1, 8.2, 8.3**

  - [ ]* 2.4 为 GridManager 编写单元测试
    - 测试 GridStack 初始化
    - 测试布局保存/加载
    - 测试错误处理和降级
    - _Requirements: 1.1_

- [ ] 3. 优化 WidgetCard 组件
  - [x] 3.1 重构 WidgetCard 渲染逻辑
    - 分离 Header、Content、Footer 渲染
    - 实现类别样式映射
    - 优化悬停交互反馈
    - _Requirements: 1.5, 2.1, 2.2_

  - [x] 3.2 实现卡片高度自适应
    - 根据内容类型计算初始高度
    - 添加内容溢出时的滚动功能
    - 优化长内容的展示
    - _Requirements: 1.2, 3.6_

  - [ ]* 3.3 为 WidgetCard 编写属性测试
    - **Property 2: 卡片高度自适应**
    - **Property 3: 类别样式区分**
    - **Property 4: 交互状态视觉反馈**
    - **Validates: Requirements 1.2, 1.5, 2.1, 2.2, 3.6**


- [ ] 4. 实现编辑模式优化
  - [x] 4.1 重构编辑模式状态管理
    - 实现编辑快照自动创建机制
    - 实现撤销功能逻辑
    - 优化编辑模式进入/退出动画
    - _Requirements: 6.5, 6.7, 2.6_

  - [x] 4.2 优化编辑器组件
    - 实现自动调整高度的 textarea
    - 实现数组编辑器的添加/删除功能
    - 实现对象数组的结构化表单编辑器
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 4.3 实现翻译模式下的编辑禁用
    - 检测翻译模式状态
    - 禁用编辑按钮并显示提示
    - 添加视觉反馈(灰化、禁用光标)
    - _Requirements: 2.5, 4.4_

  - [ ]* 4.4 为编辑功能编写属性测试
    - **Property 5: 模式切换正确性**
    - **Property 6: 翻译模式编辑禁用**
    - **Property 13: 编辑器类型匹配**
    - **Property 14: 编辑撤销功能**
    - **Property 15: 编辑保存完整性**
    - **Validates: Requirements 2.4, 2.5, 2.6, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**

  - [ ]* 4.5 为编辑功能编写单元测试
    - 测试编辑按钮点击
    - 测试撤销按钮功能
    - 测试保存验证逻辑
    - _Requirements: 6.5, 6.6_

- [ ] 5. 优化工具栏组件
  - [x] 5.1 实现工具栏 sticky 定位
    - 添加 sticky 定位样式
    - 实现滚动时的视觉效果
    - 优化 z-index 层级管理
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 实现翻译功能优化
    - 实现翻译进度显示
    - 实现逐个卡片翻译逻辑
    - 实现翻译完成后自动切换
    - _Requirements: 4.3, 5.1, 5.2, 5.3_

  - [x] 5.3 实现语言切换功能
    - 实现原文/译文切换逻辑
    - 添加切换动画效果
    - 实现翻译失败处理
    - _Requirements: 5.4, 5.5_

  - [x] 5.4 实现文件操作功能
    - 实现 JSON 导出功能
    - 实现 Markdown 复制功能
    - 添加操作成功提示
    - _Requirements: 4.5, 4.6_

  - [ ]* 5.5 为工具栏功能编写属性测试
    - **Property 8: 工具栏固定定位**
    - **Property 9: 翻译流程完整性**
    - **Property 10: 文件操作正确性**
    - **Property 11: 语言切换一致性**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4**

  - [ ]* 5.6 为工具栏功能编写单元测试
    - 测试导出按钮点击
    - 测试复制按钮功能
    - 测试翻译失败场景
    - _Requirements: 4.5, 4.6, 5.5_

- [x] 6. Checkpoint - 核心功能验证
  - 确保所有核心功能测试通过
  - 验证渲染、编辑、翻译功能正常
  - 如有问题请向用户反馈

- [ ] 7. 实现响应式设计优化
  - [x] 7.1 实现响应式网格布局
    - 配置 GridStack 响应式断点
    - 实现桌面/平板/移动布局切换
    - 优化不同屏幕下的卡片尺寸
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 7.2 实现响应式工具栏
    - 实现工具栏在小屏幕下的垂直布局
    - 优化按钮间距和尺寸
    - 添加响应式断点样式
    - _Requirements: 8.4_

  - [x] 7.3 实现移动设备交互优化
    - 检测触摸设备
    - 禁用移动设备的拖拽功能
    - 保留其他交互功能
    - _Requirements: 8.5_

  - [ ]* 7.4 为响应式功能编写属性测试
    - **Property 1: 响应式网格布局一致性** (补充响应式部分)
    - **Property 17: 响应式工具栏布局**
    - **Property 18: 移动设备拖拽禁用**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

  - [ ]* 7.5 为响应式功能编写单元测试
    - 测试断点切换
    - 测试触摸设备检测
    - 测试拖拽禁用逻辑
    - _Requirements: 8.5_

- [ ] 8. 实现状态管理优化
  - [x] 8.1 优化报告状态结构
    - 扩展 state.analysis 添加翻译进度字段
    - 添加编辑状态字段
    - 添加布局配置字段
    - _Requirements: 5.2, 6.5_

  - [x] 8.2 实现报告重新生成时的状态清理
    - 清除翻译结果
    - 清除编辑历史
    - 重置布局配置
    - _Requirements: 5.6_

  - [ ]* 8.3 为状态管理编写属性测试
    - **Property 12: 报告重新生成状态清理**
    - **Validates: Requirements 5.6**

- [ ] 9. 实现空状态和加载状态优化
  - [x] 9.1 优化骨架屏加载状态
    - 改进骨架屏动画效果
    - 为每个分析模块显示独立骨架屏
    - 优化加载状态的视觉设计
    - _Requirements: 7.3_

  - [x] 9.2 优化空状态展示
    - 改进空状态图标和文字
    - 添加操作指引
    - 优化视觉层次
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ]* 9.3 为加载状态编写属性测试
    - **Property 16: 加载状态骨架屏**
    - **Validates: Requirements 7.3**

  - [ ]* 9.4 为空状态编写单元测试
    - 测试首次进入页面的欢迎横幅
    - 测试未选择 ASIN 的提示
    - 测试分析失败的错误提示
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 10. 实现可访问性优化
  - [x] 10.1 添加 ARIA 标签
    - 为 WidgetCard 添加 role 和 aria-label
    - 为工具栏按钮添加 aria-describedby
    - 为交互元素添加 title 属性
    - _Requirements: 10.1, 10.3_

  - [x] 10.2 优化键盘导航
    - 确保所有交互元素可通过 Tab 键访问
    - 添加清晰的焦点样式
    - 实现快捷键支持(可选)
    - _Requirements: 10.2_

  - [x] 10.3 验证颜色对比度
    - 检查所有文本和背景的对比度
    - 调整不符合 WCAG AA 标准的颜色
    - 使用对比度检查工具验证
    - _Requirements: 10.5_

  - [ ]* 10.4 为可访问性编写属性测试
    - **Property 19: ARIA 标签完整性**
    - **Property 20: 键盘导航焦点指示**
    - **Property 21: 颜色对比度合规性**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.5**

  - [ ]* 10.5 为可访问性编写单元测试
    - 测试键盘导航流程
    - 测试焦点管理
    - 测试 ARIA 属性存在性
    - _Requirements: 10.1, 10.2_

- [ ] 11. 错误处理和降级方案
  - [x] 11.1 实现渲染错误处理
    - 添加 try-catch 包裹渲染逻辑
    - 显示友好的错误提示
    - 记录错误日志
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 11.2 实现 GridStack 初始化失败降级
    - 检测 GridStack 加载失败
    - 降级到简单 flex 布局
    - 显示降级提示
    - _Requirements: 1.1_

  - [x] 11.3 实现翻译失败处理
    - 捕获翻译 API 错误
    - 显示错误提示
    - 保持原文模式
    - _Requirements: 5.5_

  - [ ]* 11.4 为错误处理编写单元测试
    - 测试渲染错误场景
    - 测试 GridStack 初始化失败
    - 测试翻译失败处理
    - _Requirements: 5.5_

- [ ] 12. 集成和优化
  - [x] 12.1 整合所有优化到 AnalysisModule
    - 更新 renderReport 方法使用新的渲染器
    - 更新 initGridStack 方法使用 GridManager
    - 更新事件处理逻辑
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 12.2 优化性能
    - 优化渲染性能(减少 DOM 操作)
    - 优化事件监听器管理
    - 添加防抖和节流
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 12.3 代码清理和重构
    - 移除冗余代码
    - 统一命名规范
    - 添加必要的注释
    - _Requirements: 所有_

- [x] 13. Final Checkpoint - 完整性验证
  - 运行所有测试确保通过
  - 验证所有需求已实现
  - 检查代码质量和规范
  - 如有问题请向用户反馈

## Notes

- 标记 `*` 的任务为可选测试任务,可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号,确保可追溯性
- 属性测试使用 fast-check 库,每个测试运行 100 次迭代
- 单元测试使用 Jest + Testing Library
- Checkpoint 任务用于阶段性验证,确保增量进展
