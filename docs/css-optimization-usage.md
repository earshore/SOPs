# CSS架构优化 - 使用指南

## 概述

本项目已完成CSS架构的深度优化,实现了以下核心功能:

- ✅ **分优先级CSS加载** - 首屏关键CSS内联,其他CSS按需异步加载
- ✅ **动态主题系统** - 支持6种预设主题,运行时无刷新切换
- ✅ **模块CSS懒加载** - 路由切换时自动加载模块所需CSS
- ✅ **性能监控** - 实时追踪CSS加载性能和主题切换耗时

## 主题系统使用

### 预设主题

系统内置6种主题:

| 主题ID | 名称 | 色调 | 适用场景 |
|--------|------|------|----------|
| `default` | 默认主题 | 蓝色 | 商务场景 |
| `ocean` | 海洋主题 | 青色 | 清新宁静 |
| `sunset` | 日落主题 | 橙色 | 活力充沛 |
| `forest` | 森林主题 | 绿色 | 舒适护眼 |
| `purple` | 紫罗兰主题 | 紫色 | 优雅品味 |
| `rose` | 玫瑰主题 | 粉色 | 温柔细腻 |

### 切换主题

#### 方式1: 使用全局动作

```javascript
// 在浏览器控制台或代码中调用
window.switchTheme({ themeId: 'ocean' });
```

#### 方式2: 直接调用ThemeManager

```javascript
import { ThemeManager } from '@/common/config/themeConfig';

// 切换主题
ThemeManager.applyTheme('sunset');

// 获取当前主题
const current = ThemeManager.getCurrentTheme();

// 获取所有主题
const themes = ThemeManager.getAllThemes();
```

### 注册自定义主题

```javascript
import { ThemeManager } from '@/common/config/themeConfig';

ThemeManager.registerTheme({
  id: 'custom-dark',
  name: '深色主题',
  description: '适合夜间使用',
  colorScheme: 'blue',
  customVars: {
    '--bg-primary': '#1e293b',
    '--text-primary': '#f1f5f9'
  },
  darkMode: true
});

// 应用自定义主题
ThemeManager.applyTheme('custom-dark');
```

### 监听主题变化

```javascript
window.addEventListener('theme-changed', (event) => {
  const { themeId, theme } = event.detail;
  console.log(`主题已切换: ${theme.name}`);
});
```

## 模块CSS懒加载

### 自动加载

路由切换时会自动加载对应模块的CSS:

```javascript
// 导航到关键词猎手页面
// 系统会自动加载 keyword_hunter 模块的CSS
router.navigate('keyword_hunter');
```

### 手动加载

```javascript
import { moduleCssLoader } from '@/common/utils/moduleCssLoader';

// 加载指定模块CSS
await moduleCssLoader.loadModuleCSS('master_analysis');

// 预加载模块CSS
moduleCssLoader.preloadModuleCSS('app_center');

// 批量预加载高优先级模块
moduleCssLoader.preloadHighPriorityModules();

// 检查模块是否已加载
const isLoaded = moduleCssLoader.isModuleLoaded('sops');

// 获取加载统计
const stats = moduleCssLoader.getStats();
console.log(`已加载: ${stats.loaded}, 加载中: ${stats.loading}`);
```

### 配置模块CSS

在 `src/common/config/moduleCssRegistry.ts` 中注册模块CSS:

```typescript
export const MODULE_CSS_REGISTRY: Record<string, ModuleCssConfig> = {
  my_module: {
    moduleId: 'my_module',
    cssFiles: [
      '/src/modules/my_module/style.css'
    ],
    priority: 'normal',
    preload: false,
    dependencies: [
      '/src/css/components/markdown.css'
    ]
  }
};
```

## CSS加载器

### 基础用法

```javascript
import { cssLoader } from '@/common/utils/cssLoader';

// 加载单个CSS文件
await cssLoader.loadCSS('/src/css/components/custom.css');

// 批量加载CSS
await cssLoader.loadCSSBatch([
  '/src/css/components/a.css',
  '/src/css/components/b.css'
]);

// 预加载CSS (使用<link rel="preload">)
cssLoader.preloadCSS('/src/css/components/future.css');

// 卸载CSS
cssLoader.unloadCSS('/src/css/components/old.css');
```

### 优先级队列

CSS加载器支持优先级队列,确保关键CSS优先加载:

```javascript
// 高优先级加载
await cssLoader.loadCSS('/src/css/critical.css', { priority: 0 });

// 普通优先级
await cssLoader.loadCSS('/src/css/normal.css', { priority: 1 });

// 低优先级
await cssLoader.loadCSS('/src/css/deferred.css', { priority: 2 });
```

## 性能监控

### 开发环境

开发环境下自动启用CSS性能监控:

```javascript
// 查看性能报告
if (window.__CSS_PERF__) {
  const report = window.__CSS_PERF__.getReport();
  console.log('CSS加载统计:', report);
  console.table(report.files);
}
```

### 生产环境

生产环境下性能监控被禁用以减少开销。

## 测试页面

访问 `/test/theme-css-test.html` 可以测试:

- 主题切换功能
- 模块CSS加载
- 性能监控

## 最佳实践

### 1. 主题切换

- 在应用启动时调用 `ThemeManager.restoreTheme()` 恢复用户设置
- 提供主题选择UI,让用户自定义体验
- 使用 `theme-changed` 事件同步其他组件状态

### 2. CSS加载

- 首屏关键CSS应内联在 `index.html` 中
- 使用 `preload` 预加载即将使用的CSS
- 避免重复加载,CSS加载器会自动去重

### 3. 模块配置

- 高优先级模块设置 `preload: true`
- 合理配置 `dependencies` 避免样式缺失
- 按功能拆分CSS文件,提高复用性

### 4. 性能优化

- 使用 `requestIdleCallback` 延迟加载非关键CSS
- 监控 `__CSS_PERF__` 报告,识别性能瓶颈
- 定期清理未使用的CSS规则

## 构建优化

### PurgeCSS配置

项目已配置PurgeCSS自动清理未使用的CSS:

```javascript
// postcss.config.js
purgecss({
  content: [
    './index.html',
    './src/**/*.{js,ts,html}'
  ],
  safelist: {
    standard: [/^fa-/, /^lucide-/],
    deep: [/^hljs-/, /^markdown-/]
  }
})
```

### 构建验证

```bash
# 构建生产版本
npm run build

# 检查CSS文件大小
ls -lh dist/assets/*.css
```

预期结果:
- 主CSS文件: ~200KB (优化前 ~473KB)
- 减少约 58% 体积

## 故障排查

### 主题切换无效

1. 检查浏览器控制台是否有错误
2. 确认 `ThemeManager.restoreTheme()` 已调用
3. 验证CSS变量是否正确定义

### 模块CSS未加载

1. 检查 `moduleCssRegistry.ts` 中是否注册
2. 确认CSS文件路径正确
3. 查看网络面板是否有404错误

### 性能问题

1. 使用 `__CSS_PERF__.getReport()` 查看加载时间
2. 检查是否有重复加载
3. 考虑增加预加载或调整优先级

## 相关文件

- `src/common/config/themeConfig.ts` - 主题管理器
- `src/common/utils/cssLoader.ts` - CSS加载器
- `src/common/utils/moduleCssLoader.ts` - 模块CSS加载器
- `src/common/config/moduleCssRegistry.ts` - 模块CSS注册表
- `src/common/devtools/CSSPerformanceMonitor.ts` - 性能监控
- `postcss.config.js` - PostCSS配置
- `index.html` - 内联关键CSS

## 更新日志

### 2024-02 - CSS架构优化完成

- ✅ 实现分优先级CSS加载策略
- ✅ 创建动态主题系统(6种预设主题)
- ✅ 实现模块CSS懒加载
- ✅ 集成CSS性能监控
- ✅ 优化关键CSS到~4KB
- ✅ 配置PurgeCSS自动清理
- ✅ 创建测试页面和文档
