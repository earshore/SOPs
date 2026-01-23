# AihangSOP 迁移指南

本指南旨在帮助开发者将旧代码迁移到新的架构模式。

## 1. 动作调用 (Action Registry)

**旧模式 (Deprecated)**:
直接调用 `window` 全局函数。
```html
<button onclick="saveProxyConfig()">保存</button>
```

**新模式 (Recommended)**:
使用 `data-action` 属性，通过全局事件委托自动处理。
```html
<button data-action="saveProxyConfig">保存</button>
```

**带参数调用**:
```html
<!-- 旧模式 -->
<button onclick="selectSite('DE')">选择德国</button>

<!-- 新模式 -->
<button data-action="selectSite" data-site="DE">选择德国</button>
```

> **注意**: 现有的 `window.xxx` 调用仍可工作，但在控制台会显示警告。

---

## 2. 状态管理 (State)

**旧模式**:
直接修改 `state` 对象，手动更新 DOM。
```javascript
state.currentTab = 'home';
renderHome(); // 手动重绘
```

**新模式**:
修改 `state` (支持命名空间)，UI 自动响应（需组件支持订阅）。
```javascript
import { subscribe } from '@/common/state.js';

// 组件内订阅
subscribe('currentTab', (newVal) => {
    if (newVal === 'home') renderHome();
});

// 修改状态
state.ui.currentTab = 'home'; // 自动触发订阅回调
```

---

## 3. 模块加载

**旧模式**:
在 HTML 中硬编码 `<script>` 或直接修改 `innerHTML`。

**新模式**:
使用 `menuConfig.js` 注册路由，或使用 `registerModule` 动态注册。
```javascript
import { registerRoute } from '@/common/config/menuConfig.js';

registerRoute('my_new_feature', {
    moduleId: 'sops',
    label: '新功能',
    // ...
});
```

模块内部必须实现 `mount` 和 `unmount` 接口：
```javascript
export function mount(container) {
    container.innerHTML = 'Hello';
}

export function unmount() {
    // 清理工作
}
```
