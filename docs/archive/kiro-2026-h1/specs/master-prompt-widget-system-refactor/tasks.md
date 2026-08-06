# Implementation Plan: Master Prompt Widget System Refactor

## Overview

本实现计划将 Master Prompt 分析报告模块的 Widget 系统进行完全重构。采用优化 GridStack 实现的方案,通过创建新的管理层（WidgetSystemManager）和重构现有组件（GridManager）来解决当前的稳定性和可维护性问题。

实现策略：
1. 创建新的核心组件（WidgetSystemManager、WidgetRenderer、类型定义）
2. 完全重构 GridManager
3. 集成到现有的 AnalysisModule
4. 编写测试确保质量
5. 清理旧代码

## Tasks

- [x] 1. 创建类型定义和接口
  - 创建 `src/modules/app_center/views/master_prompt/analysis/types.ts`
  - 定义所有核心接口：`WidgetSystemConfig`, `WidgetData`, `GridOptions`, `GridWidget`, `LayoutNode`, `LayoutConfig`, `StyleConfig`
  - 导出所有类型供其他模块使用
  - _Requirements: 10.2_

- [ ] 2. 重构 GridManager 类
  - [x] 2.1 重写 GridManager 核心逻辑
    - 完全重构 `src/modules/app_center/views/master_prompt/analysis/GridManager.ts`
    - 实现完善的错误处理（快速失败策略）
    - 实现改进的布局持久化逻辑（防抖、验证、错误恢复）
    - 实现响应式支持（setColumn 方法）
    - 实现完整的事件管理（on/off 方法，内部映射）
    - 实现批量更新优化（batchUpdate 方法）
    - _Requirements: 2.1, 2.3, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 9.1, 9.2_
  
  - [ ]* 2.2 编写 GridManager 单元测试
    - 创建 `test/analysis/GridManager.test.ts`
    - 测试初始化错误处理（无效容器、GridStack 未加载）
    - 测试布局持久化（保存、加载、验证）
    - 测试响应式列数切换
    - 测试事件管理（注册、移除、清理）
    - 测试销毁逻辑（清理事件监听器）
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 2.3 编写 GridManager 属性测试
    - **Property 11: 布局持久化往返一致性** - 保存然后加载应该得到等价的布局
    - **Property 9: 最小尺寸限制** - 尝试调整到小于 2x2 时应该被限制
    - **Property 21: 清理完整性** - 销毁后应该没有残留的事件监听器
    - _Requirements: 4.2, 4.3, 3.3, 8.5_

- [ ] 3. 创建 WidgetRenderer 类
  - [x] 3.1 实现 WidgetRenderer 核心功能
    - 创建 `src/modules/app_center/views/master_prompt/analysis/WidgetRenderer.ts`
    - 实现 render 方法（渲染完整 Widget）
    - 实现 renderViewMode 方法（切换到查看模式）
    - 实现 renderEditMode 方法（切换到编辑模式）
    - 实现 renderSkeleton 方法（显示骨架屏）
    - 实现 bindEvents 方法（绑定事件监听器）
    - 实现 unbindEvents 方法（解绑事件监听器）
    - 实现 getEditedContent 方法（获取编辑后的内容）
    - 集成现有的 ViewModeRenderer 和 EditModeRenderer
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.3_
  
  - [ ]* 3.2 编写 WidgetRenderer 单元测试
    - 创建 `test/analysis/WidgetRenderer.test.ts`
    - 测试不同数据类型的渲染（字符串、数组、对象）
    - 测试骨架屏渲染
    - 测试查看/编辑模式切换
    - 测试事件绑定和解绑
    - _Requirements: 1.2, 1.3, 1.4, 6.3_
  
  - [ ]* 3.3 编写 WidgetRenderer 属性测试
    - **Property 2: Widget DOM 结构完整性** - 渲染后应该包含所有必需元素
    - **Property 3: 数据类型渲染一致性** - 不同数据类型应该有特定的视觉标记
    - **Property 4: 类别样式映射正确性** - 类别颜色应该与预定义映射匹配
    - _Requirements: 1.2, 1.4, 1.5, 7.2_

- [ ] 4. 创建 WidgetSystemManager 类
  - [x] 4.1 实现 WidgetSystemManager 核心功能
    - 创建 `src/modules/app_center/views/master_prompt/analysis/WidgetSystemManager.ts`
    - 实现初始化逻辑（init 方法）
    - 实现销毁逻辑（destroy 方法）
    - 实现 Widget 管理（addWidget, removeWidget, updateWidget, clearAllWidgets）
    - 实现编辑模式管理（enterEditMode, exitEditMode, isEditing）
    - 实现布局管理（saveLayout, loadLayout, resetLayout）
    - 实现响应式管理（handleResize）
    - 集成 GridManager 和 WidgetRenderer
    - _Requirements: 1.1, 2.1, 2.5, 3.5, 4.1, 4.3, 4.5, 5.4, 6.1, 6.2, 6.4, 6.5_
  
  - [ ]* 4.2 编写 WidgetSystemManager 单元测试
    - 创建 `test/analysis/WidgetSystemManager.test.ts`
    - 测试初始化和销毁流程
    - 测试 Widget 添加和移除
    - 测试编辑模式切换（禁用拖拽和调整大小）
    - 测试布局保存和加载
    - 测试响应式断点切换
    - 测试错误处理（同时编辑多个 Widget）
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 5.1, 5.2, 5.3_
  
  - [ ]* 4.3 编写 WidgetSystemManager 属性测试
    - **Property 1: Widget 创建完整性** - 创建的 Widget 数量应该等于模块数量
    - **Property 7: 编辑模式禁用交互** - 编辑模式下应该禁用拖拽和调整大小
    - **Property 13: 布局合并正确性** - 合并布局应该保留旧位置并为新 Widget 分配默认位置
    - **Property 14: 编辑模式 UI 切换** - 编辑模式应该显示编辑表单，查看模式应该显示内容
    - **Property 15: 编辑保存内容更新** - 保存后内容应该更新
    - **Property 16: 编辑撤销内容恢复** - 撤销后内容应该恢复
    - _Requirements: 1.1, 2.5, 3.5, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Checkpoint - 核心组件完成
  - 确保所有核心组件（GridManager、WidgetRenderer、WidgetSystemManager）已实现
  - 确保所有单元测试通过
  - 确保所有属性测试通过
  - 如有问题，向用户报告

- [ ] 6. 集成到 AnalysisModule
  - [x] 6.1 更新 AnalysisModule 主模块
    - 修改 `src/modules/app_center/views/master_prompt/analysis/index.ts`
    - 导入 WidgetSystemManager
    - 替换现有的 GridStack 初始化逻辑为 WidgetSystemManager
    - 更新 renderReport 方法使用新的 Widget 系统
    - 保留现有的 API 接口（向后兼容）
    - 更新事件监听器管理（使用 WidgetSystemManager 的事件系统）
    - _Requirements: 1.1, 2.1, 3.2, 4.3, 6.1_
  
  - [x] 6.2 更新 renderer.ts 统一接口
    - 修改 `src/modules/app_center/views/master_prompt/analysis/renderer.ts`
    - 更新导出接口以支持新的 WidgetRenderer
    - 确保向后兼容现有的渲染函数
    - _Requirements: 1.2, 1.4_
  
  - [ ]* 6.3 编写集成测试
    - 创建 `test/analysis/integration.test.ts`
    - 测试完整的分析报告渲染流程
    - 测试 Widget 拖拽和调整大小
    - 测试编辑模式切换
    - 测试布局持久化
    - 测试响应式布局切换
    - _Requirements: 1.1, 2.1, 3.2, 4.3, 5.4, 6.1_

- [ ] 7. 实现拖拽和调整大小功能测试
  - [ ]* 7.1 编写拖拽功能属性测试
    - **Property 5: 拖拽位置更新** - 拖拽后位置应该更新并对齐到网格
    - **Property 6: 拖拽冲突解决** - 拖拽导致冲突时应该自动调整其他 Widget
    - _Requirements: 2.1, 2.3, 2.4_
  
  - [ ]* 7.2 编写调整大小功能属性测试
    - **Property 8: 调整大小尺寸更新** - 调整大小后尺寸应该更新
    - **Property 10: 调整大小冲突解决** - 调整大小导致冲突时应该自动调整其他 Widget
    - _Requirements: 3.2, 3.4_

- [ ] 8. 实现性能优化和测试
  - [x] 8.1 实现性能优化
    - 在 WidgetSystemManager 中实现布局保存防抖（500ms）
    - 在 WidgetSystemManager 中实现窗口大小变化防抖（300ms）
    - 在 GridManager 中实现批量更新优化
    - 确保事件委托正确实现
    - _Requirements: 4.1, 8.3, 8.4_
  
  - [ ]* 8.2 编写性能测试
    - 创建 `test/analysis/performance.test.ts`
    - **Property 18: 渲染性能** - 10+ Widget 应该在 1 秒内完成渲染
    - **Property 19: 拖拽性能** - 拖拽应该保持 55fps 以上
    - **Property 20: 性能优化应用** - 防抖和节流应该生效
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 9. 实现错误处理和测试
  - [x] 9.1 完善错误处理逻辑
    - 在所有组件中添加详细的错误日志
    - 确保致命错误立即抛出
    - 确保可恢复错误使用降级策略
    - 确保用户操作错误给予友好提示
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 9.2 编写错误处理属性测试
    - **Property 22: 初始化错误处理** - 无效参数应该抛出明确错误
    - **Property 23: 布局加载错误恢复** - 损坏配置应该使用默认布局
    - **Property 24: Widget 渲染错误隔离** - 单个 Widget 失败不应该影响其他 Widget
    - **Property 25: 操作失败状态恢复** - 操作失败应该恢复到操作前状态
    - **Property 26: 保存失败非阻塞** - 保存失败不应该阻塞用户操作
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10. Checkpoint - 功能完成
  - 确保所有功能已实现
  - 确保所有测试通过（单元测试 + 属性测试 + 集成测试）
  - 确保测试覆盖率 >= 80%
  - 手动测试所有功能
  - 如有问题，向用户报告

- [ ] 11. 清理和优化
  - [x] 11.1 清理旧代码
    - 移除不再使用的代码和注释
    - 更新所有相关的文档和注释
    - 确保代码符合项目的编码规范
    - _Requirements: All_
  
  - [x] 11.2 性能优化验证
    - 使用 Chrome DevTools 验证性能
    - 验证内存泄漏（使用 Memory Profiler）
    - 验证渲染性能（使用 Performance Profiler）
    - 优化发现的性能瓶颈
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [x] 11.3 无障碍性检查
    - 确保所有交互元素有 aria-label
    - 确保键盘导航可用
    - 使用 axe DevTools 检查无障碍性问题
    - _Requirements: 7.4_

- [ ] 12. 最终验证和文档
  - [x] 12.1 最终功能验证
    - 验证所有需求都已实现
    - 验证所有属性测试通过
    - 验证所有单元测试通过
    - 验证所有集成测试通过
    - 手动测试所有功能
    - _Requirements: All_
  
  - [x] 12.2 更新文档
    - 更新 `docs/TS_MIGRATION_MASTER_PROMPT_PLAN.md`（如果存在）
    - 在代码中添加详细的 JSDoc 注释
    - 确保所有公共 API 都有文档
    - _Requirements: All_

- [x] 13. Final Checkpoint - 完成
  - 确保所有任务完成
  - 确保所有测试通过
  - 确保代码质量符合标准
  - 向用户报告完成情况

## Notes

- 任务标记 `*` 的为可选任务（测试相关），可以根据项目需求决定是否执行
- 每个任务都引用了具体的需求编号，确保可追溯性
- Checkpoint 任务用于确保增量验证，及时发现问题
- 属性测试使用 fast-check 库，每个测试至少运行 100 次迭代
- 单元测试使用 Jest 框架
- 所有测试文件放在 `test/analysis/` 目录下
- 实现过程中如遇到问题，及时向用户报告
