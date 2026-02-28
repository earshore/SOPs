# 路由系统迁移验证清单

## 测试日期
2026-02-28

## 测试目的
验证 Navigo 路由系统迁移是否成功，所有路由功能是否正常工作。

## 测试环境
- 浏览器：Chrome/Firefox/Safari
- 开发模式：`npm run dev`

## 测试清单

### 1. 基础路由功能

#### 1.1 页面加载
- [ ] 访问根路径 `/` 应显示 Home 页面
- [ ] 访问 `/#home` 应显示 Home 页面
- [ ] 访问 `/#sops_overview` 应显示 SOPs 总览页面
- [ ] 访问 `/#app_center_overview` 应显示 App Center 总览页面

#### 1.2 导航功能
- [ ] 点击顶部导航栏的 "SOPs" 应跳转到 SOPs 总览
- [ ] 点击顶部导航栏的 "App Center" 应跳转到 App Center 总览
- [ ] 点击顶部导航栏的 "Amazon Hub" 应跳转到 Amazon Hub 总览
- [ ] 点击顶部导航栏的 "More" 应跳转到 More 总览

#### 1.3 侧边栏导航
- [ ] 在 SOPs 模块中，侧边栏应显示所有 SOP 分类
- [ ] 点击侧边栏中的任意 SOP 项应正确跳转
- [ ] 当前激活的路由应在侧边栏中高亮显示
- [ ] 侧边栏分类应支持展开/收起

### 2. 浏览器历史记录

#### 2.1 前进/后退
- [ ] 点击浏览器后退按钮应返回上一个页面
- [ ] 点击浏览器前进按钮应前进到下一个页面
- [ ] URL hash 应正确更新
- [ ] 页面状态应正确恢复

#### 2.2 Deep Link
- [ ] 直接访问 `/#sops_npi_tracker` 应显示对应页面
- [ ] 刷新页面应保持在当前路由
- [ ] 分享链接给他人应能正确打开对应页面

### 3. 编程式导航

#### 3.1 navigateTo 函数
- [ ] 在控制台执行 `window.navigateTo('/home')` 应跳转到 Home
- [ ] 在控制台执行 `window.navigateTo('/sops_overview')` 应跳转到 SOPs 总览
- [ ] 使用 `replace: true` 选项应替换历史记录而不是添加新记录

#### 3.2 向后兼容
- [ ] 在控制台执行 `window.switchTab('home')` 应仍然有效（显示弃用警告）
- [ ] 旧的 `data-action="switchTab"` 属性应仍然有效

### 4. 模块特定功能

#### 4.1 Keyword Hunter
- [ ] 在 Input 模块点击"开始分析"应跳转到 Process 模块
- [ ] 在 Process 模块点击"同步到输入"应跳转到 Input 模块

#### 4.2 Scraper
- [ ] 在历史记录面板点击"查看报告"应跳转到 AI 分析页面
- [ ] 跳转时应正确加载历史数据

### 5. 路由守卫和中间件

#### 5.1 守卫系统
- [ ] 打开开发者工具，应能看到守卫执行日志
- [ ] 导航时应按优先级执行守卫

#### 5.2 中间件系统
- [ ] 打开开发者工具，应能看到中间件执行日志
- [ ] Before 中间件应在导航前执行
- [ ] After 中间件应在导航后执行

### 6. 错误处理

#### 6.1 404 处理
- [ ] 访问不存在的路由（如 `/#invalid_route`）应显示友好的错误提示
- [ ] 错误页面应提供返回首页的链接

#### 6.2 加载失败
- [ ] 模拟网络错误，应显示加载失败提示
- [ ] 应提供重试选项

### 7. 性能测试

#### 7.1 路由切换速度
- [ ] 路由切换应在 100ms 内完成
- [ ] 不应有明显的卡顿或延迟

#### 7.2 内存泄漏
- [ ] 连续切换 50 次路由后，内存占用应保持稳定
- [ ] 使用 Chrome DevTools Memory Profiler 验证无内存泄漏

### 8. 控制台检查

#### 8.1 启动日志
- [ ] 应看到 "🚀 [initRouter] Initializing Navigo router system..."
- [ ] 应看到 "✓ [initRouter] Converted X/Y routes"
- [ ] 应看到 "✓ [initRouter] Registered X routes and Y aliases"
- [ ] 应看到 "✅ [initRouter] Router system initialized successfully"

#### 8.2 导航日志
- [ ] 每次导航应看到 "[Guard] Navigation: from -> to"
- [ ] 每次导航应看到 "[Middleware Before] Navigating to: path"
- [ ] 每次导航应看到 "[Middleware After] Navigation complete: path"

#### 8.3 错误日志
- [ ] 不应有任何 JavaScript 错误
- [ ] 不应有任何未捕获的 Promise rejection

### 9. 向后兼容性

#### 9.1 旧代码兼容
- [ ] `window.router` 应仍然可用
- [ ] `window.switchTab` 应仍然可用（带弃用警告）
- [ ] APP_EVENTS.ROUTE_CHANGED 事件应仍然触发

#### 9.2 弃用警告
- [ ] 使用 `switchTab` 应在控制台显示弃用警告
- [ ] 警告信息应提示使用 `navigateTo` 替代

## 测试结果

### 通过的测试
- [ ] 所有基础路由功能正常
- [ ] 浏览器历史记录功能正常
- [ ] 编程式导航功能正常
- [ ] 模块特定功能正常
- [ ] 守卫和中间件正常
- [ ] 错误处理正常
- [ ] 性能符合预期
- [ ] 控制台日志正常
- [ ] 向后兼容性良好

### 发现的问题
（在此记录测试中发现的问题）

## 测试人员签名
- 测试人员：_____________
- 测试日期：_____________
- 测试结果：通过 / 不通过

## 备注
（其他需要说明的内容）
