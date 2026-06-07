# 类型边界收紧阶段归档

**项目**: SOPs - 亚马逊运营管理平台  
**归档日期**: 2026年6月7日  
**阶段状态**: 已暂停，进入收益递减点  

---

## 本次补充范围

本次只继续做了 2 轮低风险类型边界收紧，未触碰页面渲染安全、复杂度拆分、Zustand middleware 泛型、声明文件宽泛类型或服务单例私有构造绕法。

### 第 1 轮: Chart 和内部常量边界

- `src/common/utils/lazyLibs.ts`
  - 将 `ChartJS` 从 `unknown` 收紧为 `typeof import('chart.js/auto').default`。
- `src/modules/amz_hub/views/knowledge/ecosystem/index.ts`
  - 移除 `window as any` 读取 `Chart`。
  - 增加 canvas context 空值检查。
- `src/modules/amz_hub/views/knowledge/seo_strategy/index.ts`
  - 移除 `window as any` 读取 `Chart`。
  - 增加 canvas context 空值检查。
- `src/modules/amz_hub/views/knowledge/eu_insights/index.ts`
  - 移除 `window as any` 读取 `Chart`。
  - 将 `AMZ_COUNTRY_DATA as any` 改为 `CountryCode` 类型守卫。

### 第 2 轮: DOM 扩展属性边界

- `src/modules/sops/views/growth/npi_tracker/index.ts`
  - 将 `tbody._eventHandler` 的 DOM 挂属性模式改为模块内 `WeakMap<HTMLElement, EventListener>`。
  - 保持原有事件委托和重渲染行为不变。

## 验证

已通过:

```bash
npm run type-check
```

验证命令执行结果: `tsc --noEmit -p tsconfig.app.json` 通过。

## 阶段结论

当前类型削债已经吃掉“好收、低风险、收益明确”的主要部分。继续收紧仍有零散价值，但边际收益开始下降；从这里开始不建议把页面渲染安全、复杂度拆分或全局架构类型设计混入同一阶段。

## 刻意保留项

仍可在新一轮低风险类型边界阶段单独处理:

- `window as any` / Alpine 全局对象访问。
- 局部 DOM 或浏览器 API 扩展边界。
- 少量内部常量表索引类型。

暂缓，不建议混在当前阶段:

- Zustand middleware 中的 `as any`。
- `.d.ts` 中宽泛声明的整体设计。
- 服务单例私有构造绕法。
- AI report / store 跨模块数据断言。

另开阶段处理:

- 大块 `innerHTML` 和页面渲染安全。
- 复杂度拆分、长函数拆分。
- 需要页面流程验证的结构性改动。

