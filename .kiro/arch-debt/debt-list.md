# 架构债务清单

**生成/刷新时间**: 2026-07-11
**当前状态**: 跟踪清单内债务已清零；仅保留合理设计项与测试辅助 throw

---

## 📊 统计概览

| 债务类型 | 状态 | 说明 |
|---------|------|------|
| **错误处理** | ✅ 100% | 生产路径 bare `throw new Error` 已迁移为 AppError 体系 |
| **存储访问** | ✅ 100% | 业务侧走 StorageService / secureStorage |
| **事件机制** | ✅ 100% | EventBus 主路径完成；浏览器原生事件保留 |
| **日志记录** | ✅ N/A | 错误处理 fallback console 为合理保留 |
| **代码规范（事件命名）** | ✅ 100% | `app:` + kebab-case |
| **内存泄漏** | ✅ 100% | 历史 P0/P1 订阅清理已完成 |
| **CSS 废弃变量** | ✅ 100% | `--radius-*` 别名已移除 |

**整体完成率**: **100%（清单内）**

---

## ✅ 需要保留的合理设计（非债务）

### window 原生事件
1. `GlobalErrorHandler.ts` - error / unhandledrejection
2. `initRouter.ts` - popstate
3. `errorTracker.ts` / `webVitalsService.ts` / `analyticsService.ts` / `performanceService.ts`
4. `eventConstants.emitAppEvent` - 兼容桥（HISTORY 等仍可能双通道）

### console fallback
1. `AppError.ts` / `GlobalErrorHandler.ts` 最后防线
2. `scripts/` 开发脚本

### 测试辅助 `throw new Error`
仅出现在 `*.test.ts` / `__tests__` 断言辅助中，不计入生产债务。

---

## 2026-07-11 实扫结论

- 生产代码 `throw new Error`：0
- CSP connect-src 与站点清单对齐
- clipboard 共享工具在 jsdom 无 execCommand 时安全降级
- 自动化 tech-debt:scan 仅剩中等重复代码/any（测试为主），无高/严重

**更新时间**: 2026-07-11
**负责人**: Architecture Debt PM
