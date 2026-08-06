# 实施计划：应用中心模块架构统一化改造

## 概述

本实施计划将 Master Prompt 和 Keyword Hunter 模块从当前的"多Panel独立架构"迁移到统一的核心模块架构。采用渐进式迁移策略,确保每个步骤都可以独立验证和回滚。

## 任务列表

### 阶段 1: 准备工作和基础设施

- [x] 1. 创建目录结构和基础文件
  - 为 Master Prompt 创建 views/ 目录结构
  - 为 Keyword Hunter 创建 views/ 目录结构
  - 创建核心模块文件骨架 (master_prompt.js, keyword_hunter.js)
  - 创建 Shell HTML 文件 (master_prompt.html, keyword_hunter.html)
  - _需求: 1.1, 1.2, 11.1_

- [x] 1.1 编写目录结构验证测试
  - 验证所有必需的目录和文件都已创建
  - 验证文件命名符合规范
  - _需求: 11.5_

### 阶段 2: Master Prompt 模块重构

- [x] 2. 重构 Scraper 子模块
  - [x] 2.1 将 scraperPanel.js 重构为 views/scraper/index.js
    - 保持 BaseModule 继承
    - 实现 mount(container) 和 unmount() 函数
    - 将 HTML 内容移动到 template.html
    - 确保状态保存到 state.masterPrompt
    - _需求: 4.3, 2.1, 2.2, 8.9_
  
  - [x] 2.2 编写 Scraper 子模块的属性测试
    - **属性 2: 子模块生命周期与状态管理的一致性**
    - **验证: 需求 2.4, 8.9, 8.10, 16.2**
    - 测试卸载后状态保存,重新挂载后状态恢复
  
  - [x] 2.3 编写 Scraper 子模块的单元测试
    - 测试数据采集功能
    - 测试错误处理
    - _需求: 4.6_

- [x] 3. 重构 Data 子模块
  - [x] 3.1 将 dataDisplay.js 重构为 views/data/index.js
    - 保持 BaseModule 继承
    - 实现 mount(container) 和 unmount() 函数
    - 将 HTML 内容移动到 template.html
    - 确保状态保存到 state.masterPrompt
    - _需求: 4.3, 2.1, 2.2, 8.9_
  
  - [x] 3.2 编写 Data 子模块的属性测试
    - **属性 2: 子模块生命周期与状态管理的一致性**
    - **验证: 需求 2.4, 8.9, 8.10, 16.2**

- [x] 4. 重构 Analysis 子模块
  - [x] 4.1 将 analysisDisplay.js 重构为 views/analysis/index.js
    - 保持 BaseModule 继承
    - 实现 mount(container) 和 unmount() 函数
    - 将 HTML 内容移动到 template.html
    - 保留 analysisRenderer.js 为 renderer.js
    - 确保状态保存到 state.masterPrompt
    - _需求: 4.3, 2.1, 2.2, 8.9_
  
  - [x] 4.2 编写 Analysis 子模块的属性测试
    - **属性 2: 子模块生命周期与状态管理的一致性**
    - **验证: 需求 2.4, 8.9, 8.10, 16.2**

- [x] 5. 重构 Promptlab 子模块
  - [x] 5.1 将 promptlabDisplay.js 重构为 views/promptlab/index.js
    - 保持 BaseModule 继承
    - 实现 mount(container) 和 unmount() 函数
    - 将 HTML 内容移动到 template.html
    - 确保状态保存到 state.masterPrompt
    - _需求: 4.3, 2.1, 2.2, 8.9_
  
  - [x] 5.2 编写 Promptlab 子模块的属性测试
    - **属性 2: 子模块生命周期与状态管理的一致性**
    - **验证: 需求 2.4, 8.9, 8.10, 16.2**

- [x] 6. 创建 Master Prompt 核心模块文件
  - [x] 6.1 实现 master_prompt.js
    - 定义 MODULE_MAP 路由映射表
    - 实现 loadSubModule() 函数
    - 实现 waitForContainer() 函数
    - 监听 APP_EVENTS.ROUTE_CHANGED 事件
    - 实现错误处理和重试机制
    - 提供 registerSubModule() 扩展接口
    - _需求: 1.1, 1.4, 1.5, 3.1, 3.4, 6.1, 7.1-7.7, 13.1-13.5_
  
  - [x] 6.2 编写核心模块的属性测试
    - **属性 1: 路由到子模块的正确映射**
    - **验证: 需求 1.5, 2.3, 17.3**
    - **属性 3: 容器等待机制的超时处理**
    - **验证: 需求 6.1, 6.2**
    - **属性 6: 路由切换时的模块替换**
    - **验证: 需求 1.5, 2.3, 2.4, 17.3**
  
  - [x] 6.3 编写核心模块的单元测试
    - 测试 MODULE_MAP 配置正确性
    - 测试路由匹配逻辑
    - 测试错误边界 UI 渲染
    - _需求: 3.5, 7.2, 15.1-15.5_

- [x] 7. 更新 Master Prompt 配置
  - 更新 menuConfig.js 中的路由配置,统一 panelId
  - 更新 viewLoader.js 中的 VIEW_REGISTRY
  - 更新 ensureViewLoaded() 函数的路由映射逻辑
  - _需求: 3.2, 17.4_

- [x] 8. Checkpoint - Master Prompt 模块验证
  - 确保所有测试通过
  - 手动测试完整数据流: scraper -> data -> analysis -> promptlab
  - 验证状态在模块切换后保持
  - 如有问题,与用户沟通

### 阶段 3: Keyword Hunter 模块重构

- [x] 9. 拆分 Keyword Hunter 子模块
  - [x] 9.1 创建 Input 子模块 (views/input/index.js)
    - 从 trackerDisplay.js 中提取输入相关逻辑
    - 实现 mount(container) 和 unmount() 函数
    - 创建 template.html
    - 确保状态保存到 state.keywordTracker
    - _需求: 5.4, 2.1, 2.2, 8.9_
  
  - [x] 9.2 创建 Process 子模块 (views/process/index.js)
    - 从 trackerDisplay.js 中提取处理相关逻辑
    - 实现 mount(container) 和 unmount() 函数
    - 创建 template.html
    - 确保状态保存到 state.keywordTracker
    - _需求: 5.4, 2.1, 2.2, 8.9_
  
  - [x] 9.3 创建 Analysis 子模块 (views/analysis/index.js)
    - 从 trackerDisplay.js 中提取分析相关逻辑
    - 实现 mount(container) 和 unmount() 函数
    - 创建 template.html
    - 确保状态保存到 state.keywordTracker
    - _需求: 5.4, 2.1, 2.2, 8.9_
  
  - [x] 9.4 编写 Keyword Hunter 子模块的属性测试
    - **属性 2: 子模块生命周期与状态管理的一致性**
    - **验证: 需求 2.4, 8.9, 8.10, 16.2**
    - 测试三个子模块的状态管理

- [x] 10. 创建 Keyword Hunter 核心模块文件
  - [x] 10.1 实现 keyword_hunter.js
    - 定义 MODULE_MAP 路由映射表 (kw_input, kw_process, kw_analysis)
    - 实现 loadSubModule() 函数
    - 实现 waitForContainer() 函数
    - 监听 APP_EVENTS.ROUTE_CHANGED 事件
    - 实现错误处理和重试机制
    - _需求: 5.1, 5.2, 1.4, 1.5, 6.1, 7.1-7.7_
  
  - [x] 10.2 编写核心模块的属性测试
    - **属性 1: 路由到子模块的正确映射**
    - **验证: 需求 1.5, 2.3, 17.3**
    - **属性 6: 路由切换时的模块替换**
    - **验证: 需求 1.5, 2.3, 2.4, 17.3**

- [x] 11. 更新 Keyword Hunter 配置
  - 更新 menuConfig.js 中的路由配置,统一 panelId
  - 更新 viewLoader.js 中的 VIEW_REGISTRY
  - 更新 ensureViewLoaded() 函数的路由映射逻辑
  - _需求: 3.2, 17.4_

- [x] 12. Checkpoint - Keyword Hunter 模块验证
  - 确保所有测试通过
  - 手动测试完整数据流: input -> process -> analysis
  - 验证浮动窗口等特殊功能正常工作
  - 如有问题,与用户沟通

### 阶段 4: 集成测试和数据流验证

- [x] 13. 实现数据流集成测试
  - [x] 13.1 编写 Master Prompt 数据流测试
    - **属性 4: 数据流完整性保持**
    - **验证: 需求 4.6, 8.7, 10.9**
    - 测试场景1: scraper采集 -> data显示
    - 测试场景2: data删除ASIN -> analysis选择列表更新
    - 测试场景3: analysis生成报告 -> promptlab使用报告
    - 测试场景4: promptlab生成 -> analysis修改 -> promptlab更新
    - _需求: 18.1_
  
  - [x] 13.2 编写 Keyword Hunter 数据流测试
    - **属性 4: 数据流完整性保持**
    - **验证: 需求 4.6, 8.7, 10.9**
    - 测试场景1: input输入 -> process处理
    - 测试场景2: process清理 -> analysis统计更新
    - _需求: 18.2_

- [x] 14. 实现 EventBus 通信测试
  - [x] 14.1 编写 EventBus 持久性测试
    - **属性 9: EventBus 通信的持久性**
    - **验证: 需求 8.5, 10.10**
    - 测试模块卸载后重新挂载,事件订阅仍然有效
    - 测试跨模块事件通信
    - _需求: 9.1-9.6_

- [x] 15. 实现性能和懒加载测试
  - [x] 15.1 编写懒加载验证测试
    - **属性 10: 懒加载的按需性**
    - **验证: 需求 14.1, 14.2, 14.3**
    - 验证子模块代码只在首次路由激活时加载
    - 验证后续激活不重复加载
    - _需求: 14.1-14.5_

### 阶段 5: 清理和文档

- [x] 16. 清理旧代码
  - 删除旧的独立 Panel HTML 文件
  - 删除旧的 Display 文件 (如果已完全迁移)
  - 更新 import 语句
  - _需求: 17.7_

- [x] 17. 更新样式文件
  - 创建 master_prompt_style.css
  - 创建 keyword_hunter_style.css
  - 迁移现有样式
  - _需求: 1.3_

- [x] 18. 最终验证
  - 运行所有测试套件
  - 执行端到端测试
  - 验证所有需求的验收标准
  - 性能基准测试
  - _需求: 10.5_

- [x] 19. Checkpoint - 最终审查
  - 确保所有测试通过
  - 与用户确认所有功能正常
  - 准备发布

## 注意事项

### 渐进式迁移策略

- 每个阶段完成后都有 Checkpoint,确保可以独立验证
- 支持新旧架构共存,可以分阶段发布
- 如果发现问题,可以快速回滚到上一个稳定状态

### 状态管理关键点

- 所有业务状态必须存储在 state 对象中
- 不能依赖 DOM 持久化
- unmount() 时必须保存状态
- mount() 时必须恢复状态

### 测试优先级

- 所有测试任务都是必需的,确保全面的测试覆盖
- 核心功能测试(数据流、生命周期)优先级最高
- 属性测试验证系统的通用正确性
- 单元测试和集成测试确保具体功能的正确性

### 风险控制

- 每个子模块重构后立即测试,不要累积风险
- 保持频繁的 Checkpoint,及时发现问题
- 如果遇到技术难题,及时与用户沟通
