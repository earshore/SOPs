# LegacyAdapter 移除计划

**文档版本**: v1.0  
**创建日期**: 2026-02-28  
**目标移除日期**: 2026-09-01

---

## 📋 概述

LegacyAdapter 是为了确保从旧路由系统平滑迁移到 Navigo 而创建的向后兼容层。随着迁移完成，我们需要逐步移除这个兼容层，以减少代码复杂度和 bundle 大小。

## 🎯 移除目标

- **减少 bundle 大小**: 移除约 2KB (gzipped) 的兼容代码
- **简化代码库**: 消除双重 API 维护成本
- **推动代码现代化**: 鼓励使用 ES 模块导入

## 📅 分阶段移除计划

### 阶段 1: 保留期 (2026-03-01 ~ 2026-05-31)

**目标**: 保持完全兼容，收集使用数据

**行动**:
- ✅ 保留所有兼容 API
- ✅ 显示弃用警告
- ✅ 在文档中标注移除计划
- ✅ 提供迁移指南

**警告级别**: 低（仅 console.warn）

**影响范围**: 无破坏性变更

### 阶段 2: 过渡期 (2026-06-01 ~ 2026-08-31)

**目标**: 减少兼容 API，增强警告

**行动**:
- [ ] 移除不常用的兼容 API
- [ ] 保留核心 API（switchTab, router.navigate）
- [ ] 增强警告（每次调用都警告）
- [ ] 在 UI 中显示迁移提示

**警告级别**: 中（console.warn + UI 提示）

**影响范围**: 
- 移除不常用 API 可能影响少数功能
- 需要提前通知用户

**需要保留的核心 API**:
```typescript
// 保留
window.switchTab(routeId, options)
window.router.navigate(path)
window.router.back()
window.router.forward()

// 移除
window.router.getCurrentRoute()
LegacyAdapter.emitLegacyEvents()
```

### 阶段 3: 移除期 (2026-09-01)

**目标**: 完全移除 LegacyAdapter

**行动**:
- [ ] 删除 `src/common/router/navigo/LegacyAdapter.ts`
- [ ] 从 `initRouter.ts` 中移除 LegacyAdapter 初始化
- [ ] 从 `index.ts` 中移除 LegacyAdapter 导出
- [ ] 更新所有文档
- [ ] 发布 Breaking Change 公告

**警告级别**: 高（Breaking Change）

**影响范围**: 
- 所有使用 `window.switchTab` 的代码将失效
- 所有使用 `window.router` 的代码将失效

## 📊 使用情况监控

### 监控指标

在阶段 1 和阶段 2，我们需要监控以下指标：

1. **API 调用频率**
   - `window.switchTab` 调用次数
   - `window.router.*` 调用次数
   - 每个 API 的调用来源

2. **警告触发次数**
   - 每天触发的弃用警告数量
   - 不同 API 的警告分布

3. **用户反馈**
   - 迁移困难报告
   - 功能异常报告

### 监控实现

```typescript
// 在 LegacyAdapter 中添加使用统计
private static usageStats = {
  switchTab: 0,
  navigate: 0,
  back: 0,
  forward: 0,
  getCurrentRoute: 0
};

// 在每个方法中记录
createSwitchTab(): LegacySwitchTabFn {
  return (routeId: string, options = {}) => {
    LegacyAdapter.usageStats.switchTab++;
    // ... 原有逻辑
  };
}

// 提供统计查询方法
static getUsageStats() {
  return { ...LegacyAdapter.usageStats };
}
```

## 🔄 迁移指南

### 从 window.switchTab 迁移

**旧代码**:
```typescript
window.switchTab('home');
window.switchTab('qalab', { updateHistory: false });
```

**新代码**:
```typescript
import { getRouter } from '@/common/router';

const router = getRouter();
router.navigate('/home');
router.navigate('/qalab', { replace: true });
```

### 从 window.router 迁移

**旧代码**:
```typescript
window.router.navigate('/home');
window.router.back();
window.router.getCurrentRoute();
```

**新代码**:
```typescript
import { getRouter } from '@/common/router';

const router = getRouter();
router.navigate('/home');
router.back();
router.getCurrentRoute();
```

### 批量迁移脚本

```bash
# 查找所有使用 window.switchTab 的文件
grep -r "window.switchTab" src/

# 查找所有使用 window.router 的文件
grep -r "window.router" src/

# 使用 sed 批量替换（需要人工审查）
find src/ -name "*.ts" -exec sed -i '' 's/window\.switchTab/router.navigate/g' {} \;
```

## 📝 检查清单

### 阶段 1 完成标准
- [x] LegacyAdapter 添加移除计划注释
- [x] 更新警告消息包含移除日期
- [ ] 创建迁移指南文档
- [ ] 在团队会议中宣布移除计划
- [ ] 设置使用情况监控

### 阶段 2 完成标准
- [ ] 移除不常用 API
- [ ] 增强警告级别
- [ ] 在 UI 中显示迁移提示
- [ ] 确认无新增 LegacyAdapter 使用
- [ ] 迁移率 > 80%

### 阶段 3 完成标准
- [ ] 删除 LegacyAdapter 文件
- [ ] 更新所有导入
- [ ] 所有测试通过
- [ ] 文档更新完成
- [ ] 发布 Breaking Change 公告

## 🚨 风险评估

### 高风险项

1. **第三方代码依赖**
   - 风险: 外部脚本可能使用 `window.switchTab`
   - 缓解: 提前 6 个月通知，提供兼容 polyfill

2. **用户自定义脚本**
   - 风险: 用户可能在浏览器控制台使用这些 API
   - 缓解: 在控制台显示迁移提示

### 中风险项

1. **遗漏的内部代码**
   - 风险: 可能有未被发现的使用点
   - 缓解: 使用静态分析工具扫描

2. **文档不同步**
   - 风险: 文档可能仍然引用旧 API
   - 缓解: 全局搜索并更新所有文档

## 📞 联系方式

如有疑问或需要帮助，请联系：
- 技术负责人: [待填写]
- 项目经理: [待填写]
- 文档地址: `docs/legacy-adapter-removal-plan.md`

---

**最后更新**: 2026-02-28  
**下次审查**: 2026-05-01
