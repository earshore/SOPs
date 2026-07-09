# 事件常量命名规范统一任务

**任务编号**: DEBT-004
**创建时间**: 2024年
**优先级**: P2（不影响功能，但影响代码质量）
**风险等级**: 中风险
**预计工作量**: 2-3小时
**状态**: 📋 待处理

---

## 📋 任务概述

### 问题描述
`src/common/constants/eventConstants.ts` 文件中存在3种命名模式混用的问题，导致代码风格不统一，降低了可维护性。

### 当前命名模式分析

#### 模式1: `app:` 前缀 + kebab-case（推荐标准）
```typescript
ANIMATION_SETTINGS_CHANGED: 'app:animation-settings-changed'  // ✅ 已统一
```

#### 模式2: 纯 kebab-case（待统一）
```typescript
ROUTE_CHANGE: 'route-change'                    // ❌ 缺少 app: 前缀
SETTINGS_OPEN: 'open-settings'                  // ❌ 缺少 app: 前缀
SETTINGS_CLOSE: 'close-settings'                // ❌ 缺少 app: 前缀
HISTORY_UPDATED: 'history-updated'              // ❌ 缺少 app: 前缀
NAVIGATE_TO_SCRAPER: 'navigate-to-scraper'      // ❌ 缺少 app: 前缀
NAVIGATE_TO_AI_ANALYSIS: 'navigate-to-ai-analysis'  // ❌ 缺少 app: 前缀
```

#### 模式3: camelCase（待统一）
```typescript
REGISTER_ACTIONS: 'registerActions'             // ❌ 应改为 kebab-case
UNREGISTER_ACTIONS: 'unregisterActions'         // ❌ 应改为 kebab-case
```

## 🎯 修复目标

将所有应用级事件统一为 `app:` 前缀 + kebab-case 格式，保持与已修复的 `ANIMATION_SETTINGS_CHANGED` 一致。

---

## 📝 待统一的常量列表

### 1. ROUTE_CHANGE
```typescript
// 修改前
ROUTE_CHANGE: 'route-change'

// 修改后
ROUTE_CHANGE: 'app:route-change'
```
**影响范围**: 需要检查使用情况

---

### 2. SETTINGS_OPEN
```typescript
// 修改前
SETTINGS_OPEN: 'open-settings'

// 修改后
SETTINGS_OPEN: 'app:settings-open'
```
**影响范围**: 需要检查使用情况

---

### 3. SETTINGS_CLOSE
```typescript
// 修改前
SETTINGS_CLOSE: 'close-settings'

// 修改后
SETTINGS_CLOSE: 'app:settings-close'
```
**影响范围**: 需要检查使用情况

---

### 4. HISTORY_UPDATED ⚠️ 高频使用
```typescript
// 修改前
HISTORY_UPDATED: 'history-updated'

// 修改后
HISTORY_UPDATED: 'app:history-updated'
```
**影响范围**: 
- `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts` (2处触发)
- `src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts` (1处触发)
- `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts` (1处触发)
- `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts` (2处监听)
- `src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts` (2处监听)

**总计**: 约8处使用

---

### 5. NAVIGATE_TO_SCRAPER ⚠️ 可能废弃
```typescript
// 修改前
NAVIGATE_TO_SCRAPER: 'navigate-to-scraper'

// 修改后
NAVIGATE_TO_SCRAPER: 'app:navigate-to-scraper'
```
**影响范围**: 
- `src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts` (已改用EventBus)
- 可能已废弃，需要确认是否还有其他使用

---

### 6. NAVIGATE_TO_AI_ANALYSIS ⚠️ 可能废弃
```typescript
// 修改前
NAVIGATE_TO_AI_ANALYSIS: 'navigate-to-ai-analysis'

// 修改后
NAVIGATE_TO_AI_ANALYSIS: 'app:navigate-to-ai-analysis'
```
**影响范围**: 需要检查使用情况，可能已废弃

---

### 7. REGISTER_ACTIONS
```typescript
// 修改前
REGISTER_ACTIONS: 'registerActions'

// 修改后
REGISTER_ACTIONS: 'app:register-actions'
```
**影响范围**: 
- `src/common/router/navigo/PreloadManager.ts` (1处触发)
- `src/common/BaseModule.ts` (1处监听)

**总计**: 约2处使用

---

### 8. UNREGISTER_ACTIONS
```typescript
// 修改前
UNREGISTER_ACTIONS: 'unregisterActions'

// 修改后
UNREGISTER_ACTIONS: 'app:unregister-actions'
```
**影响范围**: 需要检查使用情况

---

## 📊 影响范围统计

### 按使用频率排序
1. **HISTORY_UPDATED**: 约8处使用（高频）
2. **REGISTER_ACTIONS**: 约2处使用（中频）
3. **ROUTE_CHANGE**: 需要检查
4. **SETTINGS_OPEN**: 需要检查
5. **SETTINGS_CLOSE**: 需要检查
6. **UNREGISTER_ACTIONS**: 需要检查
7. **NAVIGATE_TO_SCRAPER**: 可能废弃
8. **NAVIGATE_TO_AI_ANALYSIS**: 可能废弃

### 需要修改的文件类型
- **事件常量定义**: 1个文件 (`eventConstants.ts`)
- **事件触发方**: 约5-7个文件
- **事件监听方**: 约4-6个文件
- **测试文件**: 约8个文件

**预计总文件数**: 约19个文件

---

## 🔍 修复前准备工作

### 第一步：完整影响范围扫描
使用 grepSearch 扫描每个事件的实际使用情况：

```bash
# 扫描 ROUTE_CHANGE
grepSearch "route-change" --includePattern "**/*.ts"

# 扫描 SETTINGS_OPEN/CLOSE
grepSearch "open-settings|close-settings" --includePattern "**/*.ts"

# 扫描 HISTORY_UPDATED
grepSearch "history-updated" --includePattern "**/*.ts"

# 扫描 NAVIGATE_TO_*
grepSearch "navigate-to-scraper|navigate-to-ai-analysis" --includePattern "**/*.ts"

# 扫描 REGISTER/UNREGISTER_ACTIONS
grepSearch "registerActions|unregisterActions" --includePattern "**/*.ts"
```

### 第二步：识别废弃事件
确认以下事件是否还在使用：
- `NAVIGATE_TO_SCRAPER`
- `NAVIGATE_TO_AI_ANALYSIS`

如果已废弃，可以直接删除常量定义。

### 第三步：制定修复顺序
按影响范围从小到大排序：
1. 低频事件（1-2处使用）
2. 中频事件（3-5处使用）
3. 高频事件（6+处使用）

---

## 🛠️ 修复策略

### 阶段1: 修复事件常量定义
修改 `src/common/constants/eventConstants.ts`：
```typescript
export const APP_EVENTS = {
  // ... 其他事件
  
  // 修改这些常量的值
  ROUTE_CHANGE: 'app:route-change',
  SETTINGS_OPEN: 'app:settings-open',
  SETTINGS_CLOSE: 'app:settings-close',
  HISTORY_UPDATED: 'app:history-updated',
  NAVIGATE_TO_SCRAPER: 'app:navigate-to-scraper',
  NAVIGATE_TO_AI_ANALYSIS: 'app:navigate-to-ai-analysis',
  REGISTER_ACTIONS: 'app:register-actions',
  UNREGISTER_ACTIONS: 'app:unregister-actions',
} as const;
```

### 阶段2: 验证类型检查
```bash
npm run type-check
```

**预期结果**: 
- ✅ 如果所有代码都使用 `APP_EVENTS.XXX` 常量，类型检查应该通过
- ❌ 如果有硬编码的事件名字符串，会导致事件无法触发/监听

### 阶段3: 扫描硬编码字符串
查找是否有直接使用字符串而不是常量的情况：
```bash
grepSearch "'route-change'|'open-settings'|'close-settings'" --includePattern "**/*.ts"
grepSearch "'history-updated'|'navigate-to-scraper'" --includePattern "**/*.ts"
grepSearch "'registerActions'|'unregisterActions'" --includePattern "**/*.ts"
```

### 阶段4: 修复硬编码字符串
如果发现硬编码字符串，需要：
1. 改为使用 `APP_EVENTS` 常量
2. 或者更新字符串值为新的命名格式

### 阶段5: 更新测试文件
检查并更新所有测试文件中的事件名称。

---

## ✅ 验证清单

### 构建验证
- [ ] `npm run type-check` 通过
- [ ] `npm run build` 通过

### 功能验证
- [ ] 路由切换正常（ROUTE_CHANGE）
- [ ] 设置面板开关正常（SETTINGS_OPEN/CLOSE）
- [ ] 历史记录更新正常（HISTORY_UPDATED）
- [ ] 页面导航正常（NAVIGATE_TO_*）
- [ ] 命令面板注册正常（REGISTER/UNREGISTER_ACTIONS）

### 测试验证
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过

---

## ⚠️ 风险评估

### 中风险因素
1. **影响范围广**: 约19处代码需要修改
2. **测试文件多**: 8个测试文件需要更新
3. **硬编码风险**: 可能存在直接使用字符串的情况
4. **事件失效**: 如果修改不完整，会导致事件无法触发/监听

### 降低风险措施
1. **完整扫描**: 修复前先完整扫描所有使用情况
2. **分阶段验证**: 每个阶段完成后立即验证
3. **保持常量**: 确保所有代码都使用 `APP_EVENTS` 常量
4. **充分测试**: 手动测试所有相关功能

---

## 🔄 回滚策略

### 快速回滚
```bash
git revert <commit-hash>
```

### 部分回滚
如果只有某些事件有问题，可以只回滚对应的常量值。

---

## 📈 预期收益

### 代码质量提升
- ✅ 命名规范统一
- ✅ 代码风格一致
- ✅ 可维护性提高

### 开发体验改善
- ✅ 事件名称更清晰
- ✅ 更容易区分应用级和模块级事件
- ✅ 降低命名冲突风险

---

## 📝 相关文档

- [第三批修复计划](./batch-3-plan.md) - ANIMATION_SETTINGS_CHANGED 修复记录
- [事件常量文件](../../src/common/constants/eventConstants.ts)
- [EventBus实现](../../src/common/EventBus.ts)

---

## 🎯 下一步行动

### 立即行动
1. [ ] 执行完整影响范围扫描
2. [ ] 统计每个事件的实际使用次数
3. [ ] 识别废弃事件
4. [ ] 制定详细修复计划

### 等待确认
1. [ ] 用户确认是否执行此任务
2. [ ] 用户确认修复优先级
3. [ ] 用户确认是否删除废弃事件

---

**任务创建人**: Architecture Debt PM
**最后更新**: 2024年
**下次审查**: 待定
