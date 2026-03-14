#!/usr/bin/env node
/**
 * API 文档生成脚本
 * 使用 JSDoc 生成项目 API 文档
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📚 开始生成 API 文档...\n');

// 检查 JSDoc 是否安装
try {
  execSync('jsdoc --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ JSDoc 未安装，请运行: npm install -D jsdoc docdash');
  process.exit(1);
}

// 清理旧文档
const docsDir = path.join(__dirname, '../docs/api');
if (fs.existsSync(docsDir)) {
  console.log('🧹 清理旧文档...');
  fs.rmSync(docsDir, { recursive: true, force: true });
}

// 生成文档
try {
  console.log('📝 生成 API 文档...');
  execSync('jsdoc -c jsdoc.config.json', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ API 文档生成成功！');
  console.log(`📂 文档位置: ${docsDir}`);
  console.log('🌐 打开文档: docs/api/index.html\n');
  
  // 生成文档索引
  generateDocIndex(docsDir);
  
} catch (error) {
  console.error('\n❌ 文档生成失败:', error.message);
  process.exit(1);
}

/**
 * 生成文档索引页面
 */
function generateDocIndex(docsDir) {
  const indexPath = path.join(docsDir, 'README.md');
  const indexContent = `# API 文档

## 核心模块

### 基础设施层
- [SafeModuleLoader](./SafeModuleLoader.html) - 安全模块加载器
- [AlpineRegistry](./AlpineRegistry.html) - Alpine 组件注册管理
- [SafeRenderer](./SafeRenderer.html) - 安全渲染器

### 依赖注入
- [DIContainer](./DIContainer.html) - 依赖注入容器
- [ServiceRegistry](./ServiceRegistry.html) - 服务注册表
- [ServiceBootstrap](./ServiceBootstrap.html) - 服务启动器

### 状态管理
- [useAppStore](./useAppStore.html) - Zustand 状态管理
- [stateSync](./stateSync.html) - 状态同步工具

### 路由系统
- [Router](./Router.html) - Navigo 路由适配器
- [initRouter](./initRouter.html) - 路由初始化

### 事件系统
- [EventBus](./EventBus.html) - 事件总线

### 错误处理
- [AppError](./AppError.html) - 应用错误基类
- [GlobalErrorHandler](./GlobalErrorHandler.html) - 全局错误处理器

## 使用指南

查看 [最佳实践文档](../../best-practices.md) 了解如何正确使用这些 API。

## 更新日志

文档最后更新: ${new Date().toISOString().split('T')[0]}
`;

  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('📄 生成文档索引: docs/api/README.md');
}
