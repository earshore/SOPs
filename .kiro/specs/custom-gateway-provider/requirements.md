# Requirements Document

## Introduction

本文档定义了自定义网关厂商功能的需求。该功能在现有LLM配置管理页面的基础上扩展，当用户选择"自定义网关"选项时，允许用户选择一个厂商标识（复用现有厂商列表，剔除第三方网关）并配置自定义的API网关地址。系统将通过用户指定的代理服务访问对应LLM厂商的API，而不是使用默认的官方端点。这为用户提供了更大的灵活性，支持使用自建网关、第三方代理服务或企业内部的API中转服务。

## Glossary

- **System**: 指LLM配置管理系统
- **LLM_Config_Page**: 现有的LLM配置管理页面
- **Custom_Gateway_Option**: 自定义网关选项，用户在LLM_Config_Page中可选择的配置类型
- **Gateway_Configuration**: 自定义网关配置，包含厂商标识和网关地址
- **Provider_Identifier**: LLM厂商标识（如OpenAI、Anthropic、Gemini等），不包括第三方网关
- **Provider_List**: 系统现有的厂商列表，剔除第三方网关后可供选择
- **Gateway_URL**: 用户自定义的完整API网关地址
- **Model_List**: 通过网关获取的可用模型列表
- **Connectivity_Test**: 网关连通性测试功能
- **Default_Configuration**: 系统默认的厂商配置
- **Custom_Gateway**: 用户配置的自定义网关
- **API_Adapter**: LLM厂商API适配器
- **Third_Party_Gateway**: 第三方网关厂商，需要从Provider_List中剔除

## Requirements

### Requirement 1: 配置自定义网关UI

**User Story:** 作为系统用户，我希望在LLM配置页面中选择"自定义网关"选项时能够看到专门的配置界面，以便配置自定义的API网关地址。

#### Acceptance Criteria

1. WHEN 用户访问LLM_Config_Page THEN THE System SHALL 显示Custom_Gateway_Option作为可选配置类型
2. WHEN 用户选择Custom_Gateway_Option THEN THE System SHALL 显示自定义网关配置界面
3. WHEN 自定义网关配置界面显示 THEN THE System SHALL 提供Provider_List下拉选择器（剔除Third_Party_Gateway）
4. WHEN 自定义网关配置界面显示 THEN THE System SHALL 提供Gateway_URL输入框
5. WHEN 用户未选择Custom_Gateway_Option THEN THE System SHALL 隐藏自定义网关配置界面

### Requirement 2: 选择厂商标识

**User Story:** 作为系统用户，我希望能够从现有的厂商列表中选择一个厂商标识，以便为该厂商配置自定义网关。

#### Acceptance Criteria

1. WHEN 用户打开Provider_List下拉选择器 THEN THE System SHALL 显示所有非Third_Party_Gateway的厂商选项
2. WHEN 用户选择一个Provider_Identifier THEN THE System SHALL 将该标识关联到当前Gateway_Configuration
3. WHEN Provider_List加载 THEN THE System SHALL 自动剔除所有Third_Party_Gateway选项
4. WHEN 用户未选择Provider_Identifier THEN THE System SHALL 阻止保存配置并提示用户选择厂商
5. WHEN Provider_Identifier已被选择 THEN THE System SHALL 在下拉选择器中高亮显示当前选择

### Requirement 3: 配置网关地址

**User Story:** 作为系统用户,我希望能够输入自定义的网关地址，以便系统通过我的代理服务访问LLM API。

#### Acceptance Criteria

1. WHEN 用户在Gateway_URL输入框中输入地址 THEN THE System SHALL 验证URL格式的有效性
2. WHEN 用户保存Gateway_Configuration THEN THE System SHALL 持久化存储该配置
3. WHEN Gateway_URL为空 THEN THE System SHALL 阻止保存并提示用户填写网关地址
4. WHEN Gateway_URL格式无效 THEN THE System SHALL 显示格式错误提示
5. WHEN Gateway_URL格式有效 THEN THE System SHALL 允许用户继续配置或保存

### Requirement 4: 通过自定义网关调用API

**User Story:** 作为系统用户，我希望系统能够使用我配置的网关地址来调用LLM API，以便通过我的代理服务访问模型。

#### Acceptance Criteria

1. WHEN 存在Custom_Gateway配置 THEN THE System SHALL 使用Gateway_URL替代默认API端点
2. WHEN 调用LLM API THEN THE System SHALL 通过Gateway_URL发送请求
3. WHEN Custom_Gateway未配置 THEN THE System SHALL 使用Default_Configuration的API端点
4. WHEN API_Adapter构建请求 THEN THE System SHALL 保持原有的请求格式和认证方式
5. WHEN 切换不同的Provider_Identifier THEN THE System SHALL 使用对应的Gateway_Configuration

### Requirement 5: 获取模型列表

**User Story:** 作为系统用户，我希望能够通过自定义网关获取可用的模型列表，以便了解该网关支持哪些模型。

#### Acceptance Criteria

1. WHEN 用户请求获取Model_List THEN THE System SHALL 通过Gateway_URL调用模型列表API
2. WHEN 网关返回模型数据 THEN THE System SHALL 解析并显示Model_List
3. WHEN 网关请求失败 THEN THE System SHALL 显示错误信息并保留当前配置
4. WHEN Model_List为空 THEN THE System SHALL 提示用户该网关暂无可用模型
5. WHEN 获取Model_List成功 THEN THE System SHALL 缓存模型列表以供后续使用

### Requirement 6: 测试网关连通性

**User Story:** 作为系统用户，我希望能够测试自定义网关的连通性，以便在保存配置前确认网关地址是否可用。

#### Acceptance Criteria

1. WHEN 用户点击测试按钮 THEN THE System SHALL 向Gateway_URL发送Connectivity_Test请求
2. WHEN Connectivity_Test成功 THEN THE System SHALL 显示成功提示信息
3. WHEN Connectivity_Test失败 THEN THE System SHALL 显示详细的错误信息
4. WHEN 测试进行中 THEN THE System SHALL 显示加载状态并禁用测试按钮
5. WHEN Gateway_URL未填写 THEN THE System SHALL 阻止测试并提示用户先填写网关地址

### Requirement 7: 管理网关配置

**User Story:** 作为系统用户，我希望能够查看、编辑和删除已配置的自定义网关，以便灵活管理我的网关配置。

#### Acceptance Criteria

1. WHEN 用户访问配置页面 THEN THE System SHALL 显示所有已配置的Gateway_Configuration列表
2. WHEN 用户编辑Gateway_Configuration THEN THE System SHALL 加载现有配置数据到表单
3. WHEN 用户删除Gateway_Configuration THEN THE System SHALL 移除该配置并恢复使用Default_Configuration
4. WHEN 删除操作执行前 THEN THE System SHALL 请求用户确认删除操作
5. WHEN Gateway_Configuration被删除 THEN THE System SHALL 清除相关的缓存数据

### Requirement 8: 配置隔离

**User Story:** 作为系统架构师，我希望自定义网关配置只影响用户配置的厂商，以便保持系统的稳定性和可预测性。

#### Acceptance Criteria

1. WHEN Custom_Gateway配置存在 THEN THE System SHALL 仅对该Provider_Identifier使用Gateway_URL
2. WHEN 其他Provider_Identifier未配置Custom_Gateway THEN THE System SHALL 继续使用Default_Configuration
3. WHEN 系统初始化 THEN THE System SHALL 加载所有Gateway_Configuration而不影响Default_Configuration
4. WHEN API_Adapter处理请求 THEN THE System SHALL 根据Provider_Identifier选择正确的端点配置
5. WHEN Gateway_Configuration更新 THEN THE System SHALL 仅刷新受影响的Provider_Identifier的配置

### Requirement 9: 数据持久化

**User Story:** 作为系统用户，我希望我的网关配置能够被持久化保存，以便在系统重启后仍然有效。

#### Acceptance Criteria

1. WHEN 用户保存Gateway_Configuration THEN THE System SHALL 将配置存储到本地存储
2. WHEN 系统启动 THEN THE System SHALL 从本地存储加载所有Gateway_Configuration
3. WHEN 配置数据损坏 THEN THE System SHALL 使用Default_Configuration并提示用户重新配置
4. WHEN 存储空间不足 THEN THE System SHALL 显示错误信息并阻止保存
5. WHEN 配置数据格式升级 THEN THE System SHALL 自动迁移旧版本配置数据

### Requirement 10: 错误处理

**User Story:** 作为系统用户，我希望在网关配置或使用过程中遇到错误时能够获得清晰的提示，以便快速定位和解决问题。

#### Acceptance Criteria

1. WHEN Gateway_URL无法访问 THEN THE System SHALL 显示网络错误信息并建议检查网关地址
2. WHEN 网关返回认证错误 THEN THE System SHALL 提示用户检查API密钥配置
3. WHEN 网关返回格式错误 THEN THE System SHALL 提示用户该网关可能不兼容所选厂商
4. WHEN 请求超时 THEN THE System SHALL 显示超时错误并允许用户重试
5. WHEN 发生未知错误 THEN THE System SHALL 记录错误详情并显示通用错误提示
