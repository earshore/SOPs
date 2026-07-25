# 运行时策略设置 UI 完整可用设计

**Date:** 2026-07-25  
**Status:** implementation  
**Scope:** 系统设置「工具策略」区块中的 **Runtime Strategy**（`runtime_strategy_settings`）真实可配置、可保存、字段完整（相对 schema）

---

## 1. Problem

| 现象                                | 根因                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 用户看不到业务工具开关              | `deepChat.enableBusinessTools` 仅在 `runtimeStrategyService` 默认 true，**HTML 无控件**                                  |
| 文档/注释写「opt-in / fail-closed」 | 与代码默认 `true` 矛盾，误导                                                                                             |
| 「保存运行策略」只在采集/存储小节   | 工具策略区主按钮是 `saveToolStrategy()`（实际会一并保存 runtime）但文案只说「工具策略」，用户不知改 Deep Chat 数字也靠它 |
| 字段覆盖不完整                      | schema 部分字段无 UI（工具开关、部分 PPC/KH 辅助项）                                                                     |

---

## 2. Goals

| ID        | Outcome                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **RS-O1** | Playground / Deep Chat 区有 **「启用业务工具」** 开关，绑定 `deepChat.enableBusinessTools`，说明含 web_search / search_x / 只读会话工具。 |
| **RS-O2** | 开关变更经 **保存工具策略** 写入 storage；重载后读回；`isDeepChatBusinessToolsEnabled()` 与 UI 一致。                                     |
| **RS-O3** | 保存按钮文案明确：**保存工具与运行策略**（模型默认 + runtime 一并保存）。                                                                 |
| **RS-O4** | 区头 coach 说明：改数后需点底部保存；默认业务工具开启。                                                                                   |
| **RS-O5** | 单测：`setRuntimeBoolean('deepChat.enableBusinessTools')` + `saveRuntimeStrategy` / `saveToolStrategy` 持久化 false/true。                |
| **RS-O6** | 注释与产品默认一致：`enableBusinessTools` **default on**。                                                                                |

**Non-goals：** 重做整个设置页视觉；改 tool strategy 模型池逻辑；暴露 masterAnalysis 每 target token 预算矩阵（已有单独预算 UI 则保留）。

---

## 3. UI placement

Playground details 内，数字网格 **上方** 增加能力卡片：

```
┌ 业务工具 ─────────────────────────┐
│ ☑ 启用业务工具（网页搜索 / 搜索 X /  │
│   会话只读工具）                      │
│ 关闭后 Deep Chat 不再注入 tools；     │
│ 模型无法发起 search_x / web_search。  │
│ 修改后请点击下方「保存工具与运行策略」。│
└──────────────────────────────────┘
```

使用现有 checkbox 样式（同 masterAnalysis.enableCache）。

---

## 4. Save contract

| 按钮                                    | 行为                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| 保存工具与运行策略 (`saveToolStrategy`) | 写 tool target models + `saveRuntimeStrategySettings` |
| 恢复默认策略                            | 内存 `normalize(DEFAULT)`；仍需点保存才落盘           |
| 采集/存储内「保存\*策略」               | 仅 runtime（既有）                                    |

---

## 5. Files

- `systemSettings.html` — Deep Chat 开关 + 文案
- `runtimeStrategyService.ts` — 注释修正
- `businessTools.ts` — 注释修正
- `systemSettingsCurrent.test.ts` — 持久化断言
- Spec/plan 本文档

---

## 6. Verification

- 设置页勾选/取消 → 保存 → 刷新 → 状态保持
- 关闭后发搜索类问题：请求无 tools（或无工具活动条）
- 单元测试绿 + type-check + lint:warning-gate
