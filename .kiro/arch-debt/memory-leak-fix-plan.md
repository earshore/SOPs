# 内存泄漏修复计划

**创建时间**: 2024年  
**优先级**: P0（紧急）  
**预计工作量**: 2-3小时  
**风险等级**: 低（修复方案成熟，影响范围可控）

---

## 🎯 修复目标

修复3个文件中的EventBus订阅内存泄漏问题，确保：
1. 所有EventBus订阅都有对应的清理机制
2. Alpine.js组件销毁时自动清理监听器
3. 模块级订阅有明确的清理函数
4. 防止重复订阅

---

## 📋 修复批次

### 第一批：紧急修复（P0） ✅ 已完成

**文件**: `src/components/settings/systemSettings.ts`  
**优先级**: P0  
**风险**: 低  
**预计时间**: 30分钟  
**状态**: ✅ 已完成

#### 修复内容
1. 在 `SettingsPanel` 组件中添加 `_unsubscribers` 数组
2. 在 `init()` 方法中保存所有 `eventBus.on()` 返回的清理函数
3. 使用 Alpine.js 的 `$cleanup` 钩子清理订阅

#### 修复代码
```typescript
const SettingsPanel = (): SettingsPanelData => ({
    isOpen: false,
    
    // 添加清理函数数组
    _unsubscribers: [] as Array<() => void>,

    // ... 其他属性 ...

    init() {
        this.loadProxyConfig();
        this.loadProviderConfig(this.llm.provider);

        // 订阅 EventBus 事件，保存清理函数
        this._unsubscribers.push(
            eventBus.on(APP_EVENTS.SETTINGS_OPEN, () => {
                this.open();
            }),
            
            eventBus.on(APP_EVENTS.SETTINGS_CLOSE, () => {
                this.close();
            })
        );

        // 使用 Alpine.js 的 $cleanup 钩子
        // @ts-expect-error - Alpine.js $cleanup is injected at runtime
        this.$cleanup(() => {
            Logger.debug('[Settings] 清理 EventBus 订阅');
            this._unsubscribers.forEach(unsub => unsub());
            this._unsubscribers = [];
        });

        // Watch for provider changes...
        // @ts-expect-error - Alpine.js $watch is injected at runtime
        this.$watch('llm.provider', (val: string) => this.loadProviderConfig(val));
        // @ts-expect-error - Alpine.js $watch is injected at runtime
        this.$watch('proxy.type', (val: string) => {
            this.proxy.customUrl = this.proxy.savedKeyMap[val] || '';
        });
    },

    // ... 其他方法 ...
});
```

#### 验证方式
1. 打开设置面板10次
2. 在浏览器控制台运行: `eventBus.getStats()`
3. 检查 `SETTINGS_OPEN` 和 `SETTINGS_CLOSE` 的监听器数量
4. 预期结果: 监听器数量应该保持在2个（不增长）

---

### 第二批：常规修复（P1） ✅ 已完成

#### 文件1: `src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts`

**优先级**: P1  
**风险**: 低  
**预计时间**: 45分钟  
**状态**: ✅ 已完成

##### 修复内容
1. 添加 `_unsubscribers` 数组
2. 保存 EventBus 和 window 事件的清理函数
3. 添加 `destroy()` 方法

##### 修复代码
```typescript
export function createPromptlabPanel() {
    return {
        // ========== State ==========
        
        // 添加清理函数数组
        _unsubscribers: [] as Array<() => void>,

        // ... 其他属性 ...

        // ========== Lifecycle ==========

        init() {
            Logger.debug('[Promptlab] 🚀 Alpine 组件初始化');

            // 从 Zustand store 恢复状态
            this.restoreState();

            // 生成语言选项
            this.generateLanguageOptions();

            // 渲染报告分析
            this.renderReportAnalysis();

            // 初始化输入框自动高度调整
            this.initAutoHeightInputs();

            // 监听数据更新事件 - 保存清理函数
            this._unsubscribers.push(
                eventBus.on(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, () => {
                    Logger.debug('[Promptlab] 检测到数据更新，重新渲染报告分析');
                    this.renderReportAnalysis();
                })
            );

            // 监听 window 事件 - 需要手动清理
            const historyUpdatedHandler = () => {
                Logger.debug('[Promptlab] 检测到历史更新，重新渲染报告分析');
                this.renderReportAnalysis();
            };
            window.addEventListener(APP_EVENTS.HISTORY_UPDATED, historyUpdatedHandler);
            
            // 将 window 事件清理函数也加入数组
            this._unsubscribers.push(() => {
                window.removeEventListener(APP_EVENTS.HISTORY_UPDATED, historyUpdatedHandler);
            });

            // 监听 appStore 分析报告变化
            if (appStore && typeof appStore.subscribe === 'function') {
                const unsubscribeStore = appStore.subscribe((state) => {
                    if (state.analysis?.analysisReport) {
                        if (typeof (this as any).$nextTick === 'function') {
                            (this as any).$nextTick(() => {
                                this.renderReportAnalysis();
                            });
                        } else {
                            setTimeout(() => {
                                this.renderReportAnalysis();
                            }, 0);
                        }
                    }
                });
                
                // 保存 store 订阅的清理函数
                this._unsubscribers.push(unsubscribeStore);
                
                Logger.debug('[Promptlab] ✅ 已订阅 appStore 变化');
            }

            Logger.debug('[Promptlab] ✅ Alpine 组件初始化完成');
        },

        /**
         * 销毁组件，清理所有订阅
         */
        destroy() {
            Logger.debug('[Promptlab] 🔄 销毁组件，清理监听器');
            this._unsubscribers.forEach(unsub => {
                try {
                    unsub();
                } catch (error) {
                    Logger.warn('[Promptlab] 清理订阅时出错:', error);
                }
            });
            this._unsubscribers = [];
            Logger.debug('[Promptlab] ✅ 组件已销毁');
        },

        // ... 其他方法 ...
    };
}
```

##### 验证方式
1. 切换到Promptlab页面5次
2. 在浏览器控制台运行: `eventBus.getStats()`
3. 检查 `SCRAPER.SCRAPE_SUCCESS` 的监听器数量
4. 预期结果: 监听器数量应该保持稳定

---

#### 文件2: `src/components/button-ripple.ts`

**优先级**: P1  
**风险**: 低  
**预计时间**: 30分钟  
**状态**: ✅ 已完成

##### 修复内容
1. 添加模块级变量存储清理函数
2. 在 `observeAnimationSettings()` 中防止重复订阅
3. 添加 `cleanupButtonRipple()` 清理函数

##### 修复代码
```typescript
/**
 * 按钮涟漪效果初始化模块
 * 为所有按钮添加涟漪效果事件监听
 * 
 * Requirements: 1.3
 */

import { animationManager } from '../services/animation-manager';
import { createRipple } from '../utils/animation-utils';
import eventBus from '@common/EventBus';
import { APP_EVENTS } from '@common/constants/eventConstants';
import { Logger } from '../services/loggerService';

// ========== 模块级清理函数存储 ==========
let animationSettingsUnsubscribe: (() => void) | null = null;

// ... 现有函数 ...

/**
 * 监听动画设置变化
 * 当用户更改动画设置时，自动重新初始化
 */
export function observeAnimationSettings(): void {
  // 防止重复订阅
  if (animationSettingsUnsubscribe) {
    Logger.warn('[ButtonRipple] 动画设置监听器已存在，跳过重复订阅');
    return;
  }
  
  let isReinitializing = false;
  let lastReinitTime = 0;
  
  // 监听EventBus事件（由AnimationManager触发）
  animationSettingsUnsubscribe = eventBus.on(APP_EVENTS.ANIMATION_SETTINGS_CHANGED, () => {
    const now = Date.now();
    
    // 防止短时间内重复初始化（1秒内只初始化一次）
    if (isReinitializing || (now - lastReinitTime < 1000)) {
      return;
    }
    
    isReinitializing = true;
    lastReinitTime = now;
    
    Logger.info('[ButtonRipple] 动画设置已更改，重新初始化涟漪效果');
    
    // 使用 requestAnimationFrame 延迟执行，避免阻塞主线程
    requestAnimationFrame(() => {
      reinitButtonRipple();
      isReinitializing = false;
    });
  });
  
  Logger.debug('[ButtonRipple] ✅ 已订阅动画设置变化事件');
}

/**
 * 清理按钮涟漪效果的所有资源
 * 包括事件监听器和DOM观察器
 */
export function cleanupButtonRipple(): void {
  Logger.debug('[ButtonRipple] 🔄 清理按钮涟漪效果资源');
  
  // 清理动画设置监听器
  if (animationSettingsUnsubscribe) {
    animationSettingsUnsubscribe();
    animationSettingsUnsubscribe = null;
    Logger.debug('[ButtonRipple] ✅ 已清理动画设置监听器');
  }
  
  // 移除所有按钮的涟漪效果
  const initializedButtons = document.querySelectorAll<HTMLElement>('[data-ripple-initialized="true"]');
  initializedButtons.forEach((button) => {
    removeRippleFromButton(button);
  });
  
  Logger.debug('[ButtonRipple] ✅ 按钮涟漪效果资源已清理');
}
```

##### 验证方式
1. 刷新页面3次
2. 在浏览器控制台运行: `eventBus.getStats()`
3. 检查 `ANIMATION_SETTINGS_CHANGED` 的监听器数量
4. 预期结果: 监听器数量应该为1（不增长）

---

## 🔍 测试计划

### 单元测试
为每个修复添加单元测试，验证清理机制：

```typescript
// tests/unit/memory-leak-fix.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import eventBus from '@common/EventBus';
import { APP_EVENTS } from '@common/constants/eventConstants';

describe('内存泄漏修复验证', () => {
  beforeEach(() => {
    eventBus.removeAllListeners();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it('systemSettings: 多次初始化不应累积监听器', () => {
    // 模拟多次初始化
    for (let i = 0; i < 5; i++) {
      // 初始化组件
      // 销毁组件
    }

    const stats = eventBus.getStats();
    expect(stats.eventCounts[APP_EVENTS.SETTINGS_OPEN]).toBeLessThanOrEqual(1);
    expect(stats.eventCounts[APP_EVENTS.SETTINGS_CLOSE]).toBeLessThanOrEqual(1);
  });

  it('button-ripple: 多次调用observeAnimationSettings不应累积监听器', () => {
    const { observeAnimationSettings, cleanupButtonRipple } = require('@/components/button-ripple');

    // 多次调用
    observeAnimationSettings();
    observeAnimationSettings();
    observeAnimationSettings();

    const stats = eventBus.getStats();
    expect(stats.eventCounts[APP_EVENTS.ANIMATION_SETTINGS_CHANGED]).toBe(1);

    // 清理
    cleanupButtonRipple();
    const statsAfter = eventBus.getStats();
    expect(statsAfter.eventCounts[APP_EVENTS.ANIMATION_SETTINGS_CHANGED]).toBe(0);
  });
});
```

### 集成测试
在真实环境中测试内存泄漏修复效果：

```typescript
// tests/integration/memory-leak.test.ts
import { describe, it, expect } from 'vitest';
import eventBus from '@common/EventBus';

describe('内存泄漏集成测试', () => {
  it('用户频繁操作不应导致监听器累积', async () => {
    const initialStats = eventBus.getStats();
    const initialTotal = initialStats.totalListeners;

    // 模拟用户操作
    for (let i = 0; i < 10; i++) {
      // 打开设置面板
      eventBus.emit(APP_EVENTS.SETTINGS_OPEN);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 关闭设置面板
      eventBus.emit(APP_EVENTS.SETTINGS_CLOSE);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalStats = eventBus.getStats();
    const finalTotal = finalStats.totalListeners;

    // 监听器数量不应显著增长（允许少量增长，如新模块加载）
    expect(finalTotal - initialTotal).toBeLessThan(5);
  });
});
```

### 手动测试清单
- [ ] 打开设置面板10次，检查监听器数量
- [ ] 切换到Promptlab页面5次，检查监听器数量
- [ ] 刷新页面3次，检查监听器数量
- [ ] 使用Chrome DevTools Memory Profiler检查内存占用
- [ ] 长时间运行应用（1小时），检查内存是否持续增长

---

## 📊 验证标准

### 成功标准
1. **监听器数量稳定**: 重复操作后，监听器数量不增长
2. **功能正常**: 所有功能正常工作，无副作用
3. **内存稳定**: 长时间运行后，内存占用不持续增长
4. **无错误日志**: 清理过程中无错误或警告

### 验证工具
1. **EventBus统计**: `eventBus.getStats()`
2. **Chrome DevTools**: Memory Profiler
3. **单元测试**: 自动化验证
4. **集成测试**: 真实场景验证

---

## 🚀 部署计划

### 第一阶段：开发环境验证
1. 在开发分支完成修复
2. 运行单元测试和集成测试
3. 手动测试所有场景
4. Code Review

### 第二阶段：测试环境验证
1. 部署到测试环境
2. 进行压力测试（模拟长时间使用）
3. 监控内存占用和性能指标
4. 收集测试反馈

### 第三阶段：生产环境部署
1. 合并到主分支
2. 部署到生产环境
3. 监控错误日志和性能指标
4. 准备回滚方案（如有问题）

---

## 📝 后续改进

### 预防措施
1. **ESLint规则**: 添加规则检测未保存的订阅
2. **代码审查清单**: 在PR模板中添加内存泄漏检查项
3. **开发文档**: 更新EventBus使用指南，强调清理机制
4. **监控告警**: 在开发环境添加监听器数量告警

### 最佳实践文档
创建 `docs/eventbus-best-practices.md`，包含：
1. Alpine.js组件订阅模式
2. 模块级订阅模式
3. 防御性编程技巧
4. 常见陷阱和解决方案

---

## 🔗 相关文档

- [内存泄漏分析报告](.kiro/arch-debt/memory-leak-analysis.md)
- [架构债务清单](.kiro/arch-debt/debt-list.md)
- [EventBus API文档](src/common/EventBus.ts)
- [Alpine.js生命周期文档](https://alpinejs.dev/essentials/lifecycle)

---

**计划创建时间**: 2024年  
**预计完成时间**: 修复开始后3小时  
**负责人**: Refactoring Engineer  
**审查人**: Code Architecture Auditor
