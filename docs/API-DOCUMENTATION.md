# API 文档生成指南

## 快速开始

### 1. 生成 API 文档

```bash
npm run docs:api
```

这将自动生成所有核心模块的 API 文档到 `docs/api` 目录。

### 2. 查看文档

```bash
npm run docs:serve
```

这将启动一个本地服务器并自动打开浏览器查看文档。

或者直接打开文件：
```
docs/api/index.html
```

## 文档覆盖范围

### 核心基础设施
- **SafeModuleLoader** - 安全模块加载器，支持错误恢复和降级
- **AlpineRegistry** - Alpine.js 组件注册和依赖管理
- **SafeRenderer** - XSS 防护的安全渲染器

### 依赖注入系统
- **DIContainer** - 依赖注入容器，支持单例和瞬态
- **ServiceRegistry** - 服务注册表
- **ServiceBootstrap** - 服务初始化编排器

### 状态管理
- **useAppStore** - Zustand 全局状态管理
- **stateSync** - Alpine 与 Zustand 状态同步工具

### 路由系统
- **Router** - Navigo 路由适配器
- **initRouter** - 路由系统初始化

### 事件系统
- **EventBus** - 类型安全的事件总线，支持内存泄漏检测

### 错误处理
- **AppError** - 应用错误基类
- **NetworkError** - 网络错误
- **SystemError** - 系统错误
- **GlobalErrorHandler** - 全局错误处理器

## 文档结构

```
docs/api/
├── index.html              # 文档首页
├── README.md              # 文档索引
├── SafeModuleLoader.html  # SafeModuleLoader API
├── DIContainer.html       # DIContainer API
├── EventBus.html          # EventBus API
└── ...                    # 其他模块 API
```

## 添加文档注释

在代码中使用 JSDoc 格式添加注释：

```typescript
/**
 * 加载模块到容器
 * @param {HTMLElement} container - 目标容器元素
 * @param {string} modulePath - 模块路径
 * @param {ModuleLoadOptions} options - 加载选项
 * @returns {Promise<ModuleLoadResult>} 加载结果
 * @example
 * ```typescript
 * const result = await safeModuleLoader.loadModule(
 *   container,
 *   './modules/promptlab',
 *   { timeout: 5000, retryCount: 3 }
 * );
 * ```
 */
async loadModule(
  container: HTMLElement,
  modulePath: string,
  options: ModuleLoadOptions = {}
): Promise<ModuleLoadResult> {
  // 实现...
}
```

## 更新文档

每次修改核心 API 后，运行以下命令更新文档：

```bash
npm run docs:api
```

## 相关文档

- [最佳实践](./best-practices.md) - API 使用最佳实践
- [架构设计](./CSS-ARCHITECTURE-README.md) - 系统架构说明
- [迁移指南](./zustand-migration-guide.md) - 状态管理迁移

---

**维护者**: AihangSOP 开发团队  
**最后更新**: 2026-03-03
