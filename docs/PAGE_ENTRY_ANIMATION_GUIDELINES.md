# 页面访问动画规范

**适用范围**: 所有通过路由访问的页面、主模块子页面和静态模板页面  
**更新时间**: 2026-06-12  
**参考实现**: 应用中心 / PPC Tools / PPC 搜索词分析器页面进入动画

---

## 1. 动画审计结论

当前项目存在三类页面进入路径：

1. `loadTemplate()` 默认把静态模板包进 `view-fade-in-initial view-fade-in`，PPC 搜索词分析器就是这一类参考实现。
2. `SafeModuleLoader.loadTemplate()` 会禁用模板包装，页面通常在挂载后手动加旧的 `fade-in`，因此效果和 PPC 页面不完全一致。
3. `ModuleLoader` 负责 SOPs、应用中心、Amazon 智库、更多模块的子页面加载；统一入口动画应在子页面 `mount()` 完成后由内容容器触发。

本次统一后的结论：

- 页面访问动画的唯一标准类名是 `view-fade-in-initial view-fade-in`。
- `fade-in` 只保留作局部内容或旧页面兼容，不再作为页面访问动画标准。
- 已经自带 `view-fade-in` 包裹的模板不能在外层重复加同款动画，避免双重延迟和视觉发软。

---

## 2. 动画设计标准

页面访问动画用于表达“路由内容已切换完成”，不是装饰动画。

标准动效：

- 属性: 只使用 `opacity` 和 `transform`。
- 方向: 内容从下方轻微上移进入，保持工具型界面的空间连续性。
- 缓动: 使用全局 `--ease-smooth`。
- 时长: 使用全局页面视图动画 token；新增或调整时应控制在 `400ms` 到 `500ms` 内，不新增超过 `500ms` 的页面进入动画。
- 可访问性: 必须由全局 `prefers-reduced-motion: reduce` 降级，降级后内容立即可见。
- 交互: 动画不得阻塞输入、点击、滚动或路由跳转。

禁止做法：

- 页面访问动画中使用 `width`、`height`、`top`、`left`、`filter` 等高成本属性。
- 在页面容器和模板根节点同时加 `view-fade-in`。
- 为单个业务页面重新定义一套页面访问动画。
- 用持续闪烁、脉冲、弹跳替代路由进入动画。

---

## 3. 实现规范

统一工具位于 `src/common/utils/pageEnterAnimation.ts`。

新增页面或加载入口必须优先使用以下工具：

- `wrapWithPageEnterAnimation(html)`: 静态模板字符串包装。
- `applyPageEnterAnimation(container)`: 动态挂载完成后对容器触发页面进入动画。
- `clearPageEnterAnimation(container)`: 加载态、卸载或重放动画前清理标准类名。

静态模板页面：

```ts
const html = await loadTemplate('src/modules/example/views/page/template.html');
container.innerHTML = html;
```

默认会被 `loadTemplate()` 包装为标准页面进入动画。只有在外层加载器会统一触发动画时，才允许传 `disableFadeIn: true`。

主模块子页面：

```ts
createModuleLoader({
  containerId: 'example_content_area',
  shellId: 'panel-example',
  moduleMap: MODULE_MAP,
  contentEnterAnimation: true
});
```

`contentEnterAnimation: true` 是主模块子页面统一访问动画的标准开关。子页面如果已经渲染了 `view-fade-in` 根包装，加载器会跳过外层动画。

首页：

- 首页没有子模块加载器，由导航切换显示 `panel-home` 后调用 `applyPageEnterAnimation(panelHome)`。
- 业务主模块面板不在导航层重复动画，避免和内容容器形成嵌套页面动画。

---

## 4. 覆盖规则

所有页面访问路径必须落入以下任一机制：

| 页面类型 | 标准接入点 |
| --- | --- |
| 首页 | `navigation.ts` 显示 `panel-home` 后触发 |
| SOPs 子页面 | `sops.ts` 的 `ModuleLoader.contentEnterAnimation` |
| 应用中心子页面 | `app_center.ts` 的 `ModuleLoader.contentEnterAnimation` |
| Amazon 智库子页面 | `amz_hub.ts` 的 `ModuleLoader.contentEnterAnimation` |
| 更多子页面 | `more.ts` 的 `ModuleLoader.contentEnterAnimation` |
| 独立静态模板 | `loadTemplate()` 默认包装 |
| `SafeModuleLoader` 页面 | 页面挂载到主模块内容区后由外层 `ModuleLoader` 触发，或模板显式使用 `loadTemplate()` 默认包装 |

---

## 5. 验收清单

实现变更后至少检查：

- `git diff --check`
- `npm run type-check`
- 相关单元测试，例如 `tests/unit/pageEnterAnimation.test.ts`、`tests/unit/ModuleLoader.test.ts`
- 浏览器抽查 `#/home`、`#/sops`、`#/app-center/ppc_tools/ppc-search-terms`、`#/amz-hub`、`#/more`

浏览器验收标准：

- 访问页面时可看到轻微淡入上移。
- 已有 PPC 页面动画不被重复包裹。
- 切换同一主模块下的不同子页面时，内容区会重新触发进入动画。
- 减少动画偏好下页面内容立即可见。
