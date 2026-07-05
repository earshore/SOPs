# 页面实现模板规范

本文档约束 `src/modules/**/views/**` 下的新页面实现方式，目标是让同类页面在路由、加载、生命周期、CSS 和数据口径上保持一致。

## 通用约束

1. 路由以 `module.manifest.ts` 为唯一源：新增页面必须声明 `routeId`、`path`、`loaderPath`、`label`、`icon`，需要菜单分组时声明 `category`。
2. `module.loaders.ts` 只作为薄适配层：使用 `import.meta.glob('./views/**/index.ts')` 和 `buildModuleMapFromLoaderPaths()`，不要手写 routeId 到 loader 的映射。
3. 业务模块统一继承 `BaseModule`。`StandardModule` 仅保留兼容旧测试和实验代码。
4. 异步 DI 服务必须异步获取：使用 `await this.getLogger()`、`await this.getHttp()` 或 `await this.getServiceAsync(...)`，不要在业务模块中使用同步 `this.logger` / `this.http`。
5. 模块 CSS 由页面入口静态导入，让 Vite 做按路由拆包；不要新增 CSS registry 或运行时 CSS loader。
6. 模板安全加载使用 `SafeTemplateLoader`。主路由模块加载仍由 `ModuleLoader` 负责，不要把 `SafeModuleLoader.loadModule()` 接入新页面主链路。
7. 没有正式数据源时，页面文案必须明确“演示、导入、核对、复盘”等口径，不写“每日自动更新”“实时同步”等生产化承诺。

## 页面分类模板

| 分类 | 适用页面 | 推荐结构 | 实现重点 |
| --- | --- | --- | --- |
| 工具类页面 | 抓取、分析、生成、诊断、导入导出 | `index.ts` + `template.html` + `style.css`，复杂逻辑拆到 `services/` 或 `components/` | 明确输入校验、loading、错误、空结果、重试；外部请求走异步 DI 的 `http`；结果渲染必须走安全渲染工具 |
| 页面知识类 | 策略说明、合规知识、操作指南 | `index.ts` + `template.html`，必要时加局部 `style.css` | JS 只负责挂载、轻交互、锚点或折叠；知识内容保留来源、更新时间或适用边界 |
| SOP 作业流 | 检查清单、周复盘、提交流程、审核流程 | `index.ts` + `template.html` + 可选存储适配 | 区分“步骤、责任人、输入、输出、验收标准”；涉及数据时要求人工核对，不暗示自动闭环 |
| 看板/追踪类 | NPI tracker、日历、状态面板、指标追踪 | `index.ts` + `template.html` + `style.css` + 可选 `data/` 适配 | 样例数据必须标注演示；正式数据接入应独立成 adapter，避免散落在渲染代码中 |
| 模块总览页 | SOPS、AMZ Hub、More、App Center 总览 | `index.ts` + 模块级总览样式 | 只做入口组织和导航，不承载复杂业务状态；跳转使用 routeId，不写 URL path |
| 自动化/场景示例 | More 下业务场景、Agent/Workflow 示例 | `index.ts` + `template.html` + 安全边界文案 | 必须包含只读试跑、人工确认、失败回退或禁止自动动作的边界说明 |

## 标准目录

```text
src/modules/{module}/views/{category}/{page}/
  index.ts
  template.html
  style.css            # 仅当页面有独立样式时创建
  services/            # 仅当页面逻辑复杂且可测试时创建
  components/          # 仅当页面存在可复用渲染/交互块时创建
```

## 标准入口骨架

```ts
import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import './style.css';

export default class ExampleModule extends BaseModule {
  constructor() {
    super('example');
  }

  protected async render(): Promise<void> {
    const loader = SafeTemplateLoader.getInstance();
    const renderer = SafeRenderer.getInstance();
    const template = await loader.loadTemplate(
      'src/modules/{module}/views/{category}/{page}/template.html'
    );
    if (this.container) {
      renderer.renderTemplate(this.container, template);
    }
  }

  protected async init(): Promise<void> {
    const logger = await this.getLogger();
    logger.debug('Example mounted', undefined, 'ExampleModule');
  }
}
```

## 新页面审查清单

- Manifest 中的 `routeId`、`path`、`loaderPath` 已补齐，且 `loaderPath` 指向真实 `./views/**/index.ts`。
- `module.loaders.ts` 没有手写新 routeId 映射。
- 页面继承 `BaseModule`，没有在 `src/modules` 中引入 `StandardModule`。
- 没有同步使用 `this.logger`、`this.http` 或 `container.resolve('logger'/'http')`。
- CSS 由入口静态导入，没有新增 CSS registry、运行时 CSS loader 或全局散落样式。
- 模板和动态内容使用安全渲染工具，避免直接拼接未转义用户输入。
- 工具类页面覆盖 loading、error、empty、success 四类状态。
- 知识类和 SOP 页面写清楚适用范围、人工核对点和维护口径。
