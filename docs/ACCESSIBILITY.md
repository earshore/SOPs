# 无障碍规范（Accessibility）

**Status:** active · SSOT · v1.0  
**Updated:** 2026-07-26  
**Owner:** 前端 + 产品  
**目标等级（本阶段）：** **实用子集**（接近 WCAG 2.2 **AA 的关键路径**，非全站认证式合规）  

> **上位法：** [PRODUCT_PRINCIPLES](./PRODUCT_PRINCIPLES.md) · [COMPONENT_GUIDELINES](./COMPONENT_GUIDELINES.md) · [MODAL](./MODAL_DEVELOPMENT_GUIDELINES.md)  
> **诚实范围：** 内部运营工具、以 **PC 键盘 + 鼠标** 为主；移动端触控尽量满足，但不承诺完整移动 a11y 认证。

---

## 1. 产品决策

| 项 | 决策 |
| --- | --- |
| 主要输入 | 键盘 + 鼠标（PC） |
| 屏幕阅读器 | 关键流程应可理解；不承诺全站 SR 精细打磨 |
| 色觉 | 状态不只靠颜色（配文字/图标） |
| 动效 | 必须尊重 `prefers-reduced-motion` |
| 完整 WCAG 审计 | 非当前发版门禁；以本清单 + 抽检为准 |

若未来对外或采购要求 AA 认证，须单独立项升级本文件目标与 CI。

---

## 2. 强制底线（所有新 UI）

| # | 要求 | 验收 |
| --- | --- | --- |
| A1 | 可聚焦控件有 **可见 focus-visible** | Tab 可见环；勿 `outline: none` 无替代 |
| A2 | 图标按钮有 **accessible name** | `aria-label` 或可见文本 |
| A3 | 表单控件有 **可见 label**（或 sr-only 等效） | 不只靠 placeholder |
| A4 | 主操作 **键盘可达** | Tab / Enter / Space；Esc 关闭弹层 |
| A5 | 弹层 **焦点陷阱 + 关闭后焦点恢复** | 用共享 `app-modal` / confirm，勿自写残缺实现 |
| A6 | 危险操作 **确认** 且按钮文案明确 | `confirmWithModal` |
| A7 | 状态 **不只靠色** | 成功/错误有文案或图标 |
| A8 | 动效可关 | `prefers-reduced-motion`；设置「减少动效」生效 |
| A9 | 对比度可用 | 正文对比大致达标；浅灰字勿用于关键信息 |
| A10 | 触控目标 | 主按钮建议 **≥ 40–44px** 高 |

组件层细则见 [COMPONENT_GUIDELINES §9](./COMPONENT_GUIDELINES.md#9-无障碍组件层最低线)。

---

## 3. 关键路径抽检清单（发版 / 大改 UI）

人工 15–20 分钟：

### 3.1 壳层

- [ ] Tab 能从顶栏到侧栏到主内容  
- [ ] 打开/关闭 Mega 菜单不丢焦点逻辑  
- [ ] 路由切换后焦点不落到不可见节点  

### 3.2 系统设置

- [ ] 打开设置：焦点在面板内  
- [ ] Esc：无脏数据直接关；有脏数据出现确认且可用键盘选  
- [ ] 侧栏一级/二级可键盘激活（按钮）  
- [ ] 推理开关与分段可用键盘  
- [ ] 保存/测试按钮可聚焦  

### 3.3 弹层

- [ ] 打开 confirm：焦点在对话框内  
- [ ] Esc / 取消关闭；确认后焦点回到触发控件（共享实现）  

### 3.4 一处业务主路径（任选）

- [ ] Deep Chat 输入框可聚焦发送  
- [ ] 或分析页主 CTA 可键盘触发  

---

## 4. 实现指引（短）

| 场景 | 做 |
| --- | --- |
| 自定义点击 div | 改为 `button` 或补 `role="button"` + 键盘处理（优先真 button） |
| 隐藏装饰图标 | `aria-hidden="true"` |
| 活区提示 | 谨慎使用 `aria-live`；Toast 由共享层处理 |
| 跳过链接 | 可选增强；非本阶段强制 |
| 暗色模式 | 对比度随 Color Mode 验收；主题规范优先 |

---

## 5. 测试与门禁

| 类型 | 要求 |
| --- | --- |
| 自动化 | 无全量 a11y CI 强制（债务 TD-DOC/TEST）；鼓励关键交互 e2e 用 role/name |
| 人工 | 大 UI PR 与 RC 发版做 §3 抽检 |
| 工具 | 可选：浏览器 a11y 面板、axe 扩展（不替代清单） |

策略总览：[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)。

---

## 6. PR 检查（a11y）

- [ ] 无「可点 div」无键盘  
- [ ] 图标按钮有名字  
- [ ] 未去掉 focus 样式  
- [ ] 弹层走共享 modal  
- [ ] 动效考虑 reduced-motion  
- [ ] 错误/状态有非颜色通道  

---

## 7. 反模式

| 禁止 | 原因 |
| --- | --- |
| `outline: none` 且无 focus-visible 替代 | 键盘用户迷路 |
| 仅颜色表示错误 | 色弱不可用 |
| 自动播放强闪烁动画 | 前庭/光敏风险 |
| 用 `title` 代替可见错误 | 移动/键盘不可靠 |
| 弹层不锁焦点 | 焦点逃到背后页面 |

---

## 8. 相关

- [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)  
- [MODAL_DEVELOPMENT_GUIDELINES.md](./MODAL_DEVELOPMENT_GUIDELINES.md)  
- [THEME_SYSTEM_GUIDELINES.md](./THEME_SYSTEM_GUIDELINES.md)  
- [TECH_DEBT_BOARD.md](./TECH_DEBT_BOARD.md)  
