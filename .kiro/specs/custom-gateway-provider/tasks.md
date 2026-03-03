# Implementation Plan: Custom Gateway Provider

## Overview

本实现计划将自定义网关厂商功能分解为一系列增量式的编码任务。每个任务都基于前一个任务构建，确保功能逐步完善并能够及时验证。实现遵循最小化影响原则，复用现有组件和逻辑。

## Tasks

- [x] 1. 扩展ConfigPanel组件以支持目标厂商选择
  - [x] 1.1 在ConfigPanel.js中添加目标厂商相关状态
    - 添加 `targetProvider` 状态变量
    - 添加 `availableTargetProviders` 数组
    - 添加 `isLoadingTargetProviders` 加载状态
    - _Requirements: 1.3, 2.1_
  
  - [x] 1.2 实现目标厂商列表过滤逻辑
    - 实现 `loadAvailableTargetProviders()` 方法
    - 从ProviderSelector的providerMetadata中获取所有厂商
    - 过滤掉category为'custom-gateway'的厂商
    - 返回过滤后的厂商列表
    - _Requirements: 2.3_
  
  - [x] 1.3 实现gateway厂商选择时的处理逻辑
    - 实现 `handleGatewayProviderSelected()` 方法
    - 当provider变更为'gateway'时触发
    - 调用 `loadAvailableTargetProviders()`
    - 如果已有配置，恢复targetProvider值
    - _Requirements: 1.2, 2.2_
  
  - [x] 1.4 在init方法中添加targetProvider的监听
    - 使用 `$watch` 监听provider变化
    - 当provider为'gateway'时调用 `handleGatewayProviderSelected()`
    - 当provider不是'gateway'时清空targetProvider
    - _Requirements: 1.5_

- [x] 2. 修改配置保存和加载逻辑
  - [x] 2.1 扩展saveConfig方法支持targetProvider
    - 在构建configToSave对象时检查provider
    - 如果provider为'gateway'且targetProvider存在，添加到配置中
    - 如果provider为'gateway'但targetProvider为空，阻止保存并提示
    - _Requirements: 2.4, 3.2_
  
  - [x] 2.2 扩展loadConfig方法支持targetProvider
    - 从savedConfig中读取targetProvider字段
    - 如果存在则设置到组件状态
    - 如果不存在且provider为'gateway'，显示提示信息
    - _Requirements: 7.2, 9.2_
  
  - [x] 2.3 扩展配置验证逻辑
    - 在 `validateConfig()` 方法中添加gateway特定验证
    - 验证：当provider为'gateway'时，targetProvider不能为空
    - 添加相应的验证错误信息
    - _Requirements: 2.4_

- [x] 3. 更新UI模板以显示目标厂商选择器
  - [x] 3.1 在llmConfig.html中添加目标厂商选择器
    - 在API Key输入框之前添加新的表单字段
    - 使用 `x-show="provider === 'gateway'"` 条件显示
    - 添加下拉选择器，绑定到targetProvider
    - 使用 `x-for` 循环渲染availableTargetProviders
    - 显示厂商的显示名称（使用getProviderMeta）
    - _Requirements: 1.3, 2.1_
  
  - [x] 3.2 调整现有字段的标签和说明文字
    - 当provider为'gateway'时，调整"API 代理地址"的说明文字
    - 当provider为'gateway'时，调整"API Key"的说明文字
    - 使用 `x-text` 或条件渲染实现动态文本
    - _Requirements: 1.2_

- [x] 4. 扩展ConfigManager以支持targetProvider字段
  - [x] 4.1 更新ConfigManager的类型定义
    - 在JSDoc注释中添加targetProvider字段说明
    - 标注该字段为可选，仅gateway使用
    - _Requirements: 3.2_
  
  - [x] 4.2 确保setConfig方法正确保存targetProvider
    - 验证现有的setConfig实现是否需要调整
    - 确保targetProvider字段被正确序列化和加密存储
    - _Requirements: 9.1_
  
  - [x] 4.3 确保getConfig方法正确返回targetProvider
    - 验证现有的getConfig实现是否需要调整
    - 确保targetProvider字段被正确解密和返回
    - _Requirements: 9.2_

- [x] 5. 扩展GatewayAdapter以使用targetProvider
  - [x] 5.1 在GatewayAdapter构造函数中读取targetProvider
    - 从config参数中提取targetProvider字段
    - 存储为实例变量 `this.targetProvider`
    - 添加日志记录以便调试
    - _Requirements: 4.4_
  
  - [x] 5.2 验证GatewayAdapter使用自定义endpoint
    - 确认现有实现已经使用config.endpoint
    - 确认不会回退到默认端点
    - 添加必要的日志记录
    - _Requirements: 4.1, 4.2_

- [x] 6. 实现配置隔离和独立性
  - [x] 6.1 验证gateway配置不影响其他厂商
    - 检查ConfigManager的配置存储结构
    - 确认每个厂商的配置独立存储
    - 确认配置变更只影响对应厂商
    - _Requirements: 8.1, 8.2, 8.4_

- [x] 7. 添加错误处理和用户提示
  - [x] 7.1 实现目标厂商未选择的错误提示
    - 在saveConfig中添加验证
    - 使用showToast显示友好的错误信息
    - _Requirements: 2.4_
  
  - [x] 7.2 实现网关地址验证错误提示
    - 复用现有的URL验证逻辑
    - 针对gateway添加特定的错误提示
    - _Requirements: 3.4_
  
  - [x] 7.3 实现连通性测试的错误处理
    - 在testConnection方法中添加gateway特定的错误处理
    - 区分网络错误、认证错误、格式错误等
    - 显示详细的错误信息和建议
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 8. 实现向后兼容性
  - [x] 8.1 处理旧版本gateway配置
    - 在loadConfig中检查是否存在targetProvider
    - 如果不存在，显示信息提示用户选择
    - 不阻止旧配置的正常使用
    - _Requirements: 9.3_
  
  - [x] 8.2 添加配置迁移提示
    - 当检测到旧配置时，显示友好的升级提示
    - 引导用户选择目标厂商
    - _Requirements: 9.5_

- [x] 9. 添加辅助方法和工具函数
  - [x] 9.1 实现getProviderMeta方法的复用
    - 确保ConfigPanel可以访问ProviderSelector的providerMetadata
    - 实现方法获取厂商的显示名称和元数据
    - _Requirements: 2.5_
  
  - [x] 9.2 实现目标厂商变更处理
    - 添加 `handleTargetProviderChange()` 方法
    - 当用户选择目标厂商时触发
    - 标记配置为未保存状态
    - _Requirements: 2.2_

- [x] 10. 集成测试和验证
  - [x] 10.1 手动测试完整流程
    - 选择gateway厂商
    - 验证目标厂商选择器显示
    - 选择目标厂商（如openai）
    - 填写网关地址和ACCESS_PASSWORD
    - 保存配置
    - 刷新页面验证配置持久化
    - _Requirements: 1.1, 1.2, 2.1, 3.2, 9.1, 9.2_
  
  - [x] 10.2 测试配置隔离
    - 配置gateway使用自定义网关
    - 配置其他厂商（如anthropic）使用默认端点
    - 验证两者互不影响
    - _Requirements: 8.1, 8.2_
  
  - [x] 10.3 测试错误处理
    - 测试未选择目标厂商时的保存阻止
    - 测试无效网关地址的验证
    - 测试连通性测试的各种错误情况
    - _Requirements: 2.4, 3.4, 10.1, 10.2, 10.3_
  
  - [x] 10.4 测试向后兼容性
    - 创建旧版本的gateway配置（无targetProvider）
    - 验证系统正常加载
    - 验证升级提示显示
    - _Requirements: 9.3, 9.5_

- [x] 11. 最终检查和文档更新
  - [x] 11.1 代码审查和清理
    - 检查所有新增代码的注释
    - 确保变量命名清晰
    - 移除调试日志（保留必要的错误日志）
    - 确保代码符合项目规范
  
  - [x] 11.2 验证所有需求已实现
    - 对照requirements.md检查所有需求
    - 确认所有acceptance criteria已满足
    - 记录任何已知限制或未来改进点

## Notes

- 所有任务按顺序执行，每个任务完成后进行验证
- 重点关注最小化对现有系统的影响
- 复用现有的UI组件、样式和逻辑
- 保持与现有代码风格的一致性
- 每个任务都应该是可独立验证的增量改进
