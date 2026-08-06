# Implementation Plan: App Center Overview

## Overview

本实施计划将app_center模块的overview页面功能分解为离散的编码步骤。每个任务都基于已批准的需求和设计文档，采用增量开发方式，确保每一步都能验证核心功能。

## Tasks

- [x] 1. 创建overview页面基础结构
  - 在`src/modules/app_center/views/`目录下创建`overview`文件夹
  - 创建`index.js`文件，实现mount、unmount、scrollToModule三个标准函数
  - 创建`template.html`文件，定义页面HTML结构
  - 使用loadTemplate工具加载模板（与sops、more保持一致）
  - _Requirements: 1.2, 1.3, 1.4, 5.3, 5.4_

- [x] 1.1 为overview模块编写属性测试
  - **Property 1: 模块接口完整性**
  - **Validates: Requirements 1.2**

- [x] 2. 实现overview页面HTML模板
  - [x] 2.1 创建页面头部区域
    - 添加标题、图标和描述文本
    - 使用Tailwind CSS类进行样式设计
    - 使用蓝色(blue)作为主题色
    - _Requirements: 4.1, 7.1, 7.3_
  
  - [x] 2.2 创建使用指南区域
    - 添加核心价值主张卡片
    - 添加推荐使用路径说明
    - 添加快速入口按钮
    - 使用渐变背景和圆角设计
    - _Requirements: 4.1, 7.2_
  
  - [x] 2.3 创建应用工具集模块区域
    - 添加section元素，id为"app-module-apps"
    - 添加模块标题和描述
    - 使用grid布局创建卡片容器
    - _Requirements: 4.2, 7.4_
  
  - [x] 2.4 创建子应用卡片
    - 为Master Prompt创建卡片，包含名称、图标、描述、版本、状态
    - 为Keyword Hunter创建卡片，包含名称、图标、描述、版本、状态
    - 每个卡片添加data-action="switch-tab"和data-tab属性
    - 使用border-l-4样式和hover效果
    - _Requirements: 4.3, 8.2_
  
  - [x] 2.5 创建统计信息区域
    - 添加子应用总数统计
    - 使用grid布局展示统计卡片
    - _Requirements: 4.5_

- [x] 2.6 为模板渲染编写属性测试
  - **Property 2: 挂载渲染正确性**
  - **Validates: Requirements 1.4**

- [x] 2.7 为卡片内容编写属性测试
  - **Property 5: 卡片内容完整性**
  - **Validates: Requirements 4.3, 8.2**

- [x] 3. 实现事件处理逻辑
  - [x] 3.1 实现initOverviewEvents函数
    - 查询所有带data-action="switch-tab"的卡片元素
    - 为每个卡片添加点击事件监听器
    - 点击时派发'route-change'自定义事件，包含routeId
    - 添加错误处理，检查data-tab属性是否存在
    - _Requirements: 4.4, 8.1, 8.2_
  
  - [x] 3.2 实现scrollToModule函数
    - 接收categoryId参数
    - 构建moduleId（格式：app-module-{categoryId}）
    - 使用getElementById查找目标元素
    - 调用scrollIntoView实现平滑滚动
    - 添加临时高亮CSS类（app-module-highlight）
    - 2秒后移除高亮类
    - 添加参数验证和错误处理
    - _Requirements: 8.5_

- [x] 3.3 为卡片点击导航编写属性测试
  - **Property 6: 卡片点击导航**
  - **Validates: Requirements 4.4**

- [x] 3.4 为滚动功能编写属性测试
  - **Property 8: 滚动功能**
  - **Validates: Requirements 8.5**

- [x] 4. 扩展MODULE_MAP配置
  - 在`src/modules/app_center/app_center.js`中添加overview路由
  - 添加键值对：`'app_center_overview': () => import('./views/overview/index.js')`
  - 确保路由ID与menuConfig中的定义一致
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 5. 扩展MenuConfig配置
  - [x] 5.1 添加app_center模块定义
    - 在`src/common/config/menuConfig.js`的modules对象中添加app_center
    - 设置id、contextId、title、version、icon、description字段
    - contextId设置为'apps'
    - _Requirements: 3.3, 5.1_
  
  - [x] 5.2 添加appCategories配置
    - 在MENU_CONFIG中添加appCategories对象
    - 定义'apps'分类，包含id、label、icon、color、order、version、description
    - 确保字段结构与sopCategories、hubCategories、moreCategories一致
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 5.3 添加app_center_overview路由
    - 在routes对象中添加app_center_overview路由配置
    - 设置moduleId为'app_center'
    - 设置label为'应用总览'
    - 设置icon为'fas fa-th-large'
    - 设置panelId为'panel-app_center'
    - _Requirements: 2.3_

- [x] 5.4 为配置完整性编写属性测试
  - **Property 3: 分类配置完整性**
  - **Validates: Requirements 3.3**

- [x] 5.5 为结构一致性编写属性测试
  - **Property 4: 结构一致性**
  - **Validates: Requirements 3.4**

- [x] 6. 实现错误处理
  - [x] 6.1 在mount函数中添加try-catch
    - 捕获模板加载失败异常
    - 显示友好的错误提示UI
    - 记录错误日志
    - _Requirements: 1.4_
  
  - [x] 6.2 添加容器元素验证
    - 在mount函数开始处检查container参数
    - 验证是否为有效的HTMLElement
    - 无效时抛出明确的错误信息
    - _Requirements: 1.4_
  
  - [x] 6.3 在scrollToModule中添加参数验证
    - 检查categoryId是否为空
    - 检查目标元素是否存在
    - 不存在时输出警告日志但不抛出异常
    - _Requirements: 8.5_
  
  - [x] 6.4 在initOverviewEvents中添加防御性检查
    - 检查卡片数量，为0时输出警告
    - 检查每个卡片的data-tab属性
    - 缺少属性时记录错误但继续处理其他卡片
    - _Requirements: 4.4_

- [x] 7. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户反馈

- [x] 8. 实现动态注册功能（可选扩展）
  - [x] 8.1 增强registerSubModule函数
    - 检查路由ID是否已存在，存在则返回false
    - 验证loader参数是否为函数类型
    - 注册成功后记录日志并返回true
    - _Requirements: 6.4_

- [x] 8.2 为动态注册编写属性测试
  - **Property 7: 动态注册功能**
  - **Validates: Requirements 6.4**

- [x] 9. 添加CSS样式支持
  - 在`src/modules/app_center/app_center_style.css`中添加overview相关样式
  - 定义.app-overview-container类
  - 定义.app-module-section类
  - 定义.app-card-grid类（使用grid布局）
  - 定义.app-module-highlight类（高亮动画效果）
  - 定义卡片hover效果和过渡动画
  - _Requirements: 7.1, 7.2, 7.5_

- [x] 10. 集成测试和验证
  - [x] 10.1 手动测试overview页面加载
    - 启动开发服务器
    - 导航到应用中心
    - 验证overview页面正确显示
    - _Requirements: 1.1_
  
  - [x] 10.2 测试卡片点击导航
    - 点击Master Prompt卡片，验证跳转到scraper页面
    - 点击Keyword Hunter卡片，验证跳转到kw_input页面
    - _Requirements: 4.4, 8.1_
  
  - [x] 10.3 测试scrollToModule功能
    - 调用scrollToModule('apps')
    - 验证页面滚动到应用工具集区域
    - 验证高亮效果正确显示和消失
    - _Requirements: 8.5_

- [x] 11. Final checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户反馈

## Notes

- 每个任务都引用了具体的需求编号，确保可追溯性
- Checkpoint任务确保增量验证
- 属性测试验证通用正确性属性，每个测试最少运行100次迭代
- 单元测试验证具体示例和边界情况
- 所有代码应遵循现有项目的编码规范和风格
- 使用ES6+模块化语法和动态import
- 所有字符串使用UTF-8编码
- 测试文件应放置在`test/app_center/`目录下
- 所有任务均为必需，确保从一开始就有全面的测试覆盖
