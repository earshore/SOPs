# 技术债务报告

**日期**: 2026-02-28  
**版本**: 3.0.1  
**检查范围**: 路由系统迁移后的全面代码审查

## 执行摘要

系统整体健康状况良好，路由系统迁移成功完成。发现 1 个高优先级、3 个中优先级和 3 个低优先级技术债务项。

## 高优先级技术债务 (P1)

### 1. 认证和权限系统未实现

**位置**: `src/common/router/navigo/builtinGuards.ts`

**问题描述**:
- `checkAuth()` 函数暂时返回 `true`，未实现实际认证逻辑
- `checkPermission()` 函数暂时返回 `true`，未实现权限检查

**影响**:
- 所有路由均可无限制访问
- 无法保护敏感功能和数据

**建议方案**:
1. 集成现有的认证系统（如果有）
2. 实现基于 token 的认证机制
3. 添加角色和权限管理

**优先级**: P1  
**预计工时**: 16-24h

---

## 中优先级技术债务 (P2)

### 1. ConfigSchema 类型安全问题

**位置**: `src/common/config/schemas/configSchema.ts:51`

**问题描述**:
```typescript
routes: z.any() // MenuConfig类型复杂,暂时使用any
```

**影响**:
- 失去 routes 配置的类型检查
- 可能导致运行时错误

**建议方案**:
- 为 MenuConfig 创建完整的 Zod schema
- 或使用 `z.record()` 提供基本类型约束

**优先级**: P2  
**预计工时**: 4-6h

### 2. 构建警告: 静态和动态导入混用

**位置**: 多个文件

**问题描述**:
Vite 构建时警告多个模块同时使用静态和动态导入，导致代码分割失效：
- `src/modules/app_center/views/master_analysis/qalab/actions.ts`
- `src/stores/useAppStore.ts`
- `src/common/config/menuConfig.ts`
- 等 18 个文件

**影响**:
- 无法有效进行代码分割
- 增加初始加载包大小

**建议方案**:
1. 统一使用静态导入（推荐）
2. 或完全改为动态导入
3. 重新设计模块依赖关系

**优先级**: P2  
**预计工时**: 8-12h

### 3. 主包大小超过阈值

**位置**: 构建产物

**问题描述**:
- `main-bYXCYPFP.js`: 330.54 KB (gzipped: 80.88 KB)
- 超过 300KB 警告阈值

**影响**:
- 首屏加载时间增加
- 移动端体验下降

**建议方案**:
1. 进一步拆分代码块
2. 优化依赖引入
3. 使用更激进的 tree-shaking

**优先级**: P2  
**预计工时**: 6-8h

---

## 低优先级技术债务 (P3)

### 1. LegacyAdapter 向后兼容层

**位置**: `src/common/router/navigo/LegacyAdapter.ts`

**问题描述**:
- 为旧路由系统提供兼容层
- 计划在 2026-09 完全移除

**影响**:
- 增加代码复杂度
- 维护成本

**建议方案**:
- 按照移除计划执行（已有详细文档）
- 分 3 个阶段逐步移除

**优先级**: P3  
**预计工时**: 已规划

### 2. @deprecated 标记未清理

**位置**: 多个文件

**问题描述**:
- `src/services/llmService.ts`: ModelInfo 接口标记为 deprecated
- `src/modules/home/homeDisplay.ts`: initHomeSplash 函数标记为 deprecated

**影响**:
- 代码混乱
- 可能被误用

**建议方案**:
- 移除已弃用的代码
- 或添加运行时警告

**优先级**: P3  
**预计工时**: 2-4h

### 3. 临时 DOM 元素用于 HTML 清理

**位置**: 
- `src/common/infrastructure/SafeRenderer.ts:330`
- `src/common/utils/security.ts:181`

**问题描述**:
```typescript
const temp = document.createElement('div');
temp.innerHTML = html;
```

**影响**:
- 性能开销（较小）
- 可能的 XSS 风险（已有其他防护）

**建议方案**:
- 使用 DOMParser API
- 或使用专门的 HTML 清理库

**优先级**: P3  
**预计工时**: 2-3h

---

## 已解决的技术债务

### ✅ 弃用 API `initRouterSystem()` 已删除
- **日期**: 2026-02-28
- **位置**: `src/common/router/index.ts`

### ✅ 生产环境 console.log 问题已修复
- **日期**: 2026-02-28
- **方案**: 使用 `import.meta.env.DEV` 条件包裹

### ✅ JavaScript 模块 MIME 类型错误已修复
- **日期**: 2026-02-28
- **方案**: 在 `_headers` 中添加正确的 MIME 类型配置

---

## 建议行动计划

### 短期 (1-2 周)
1. 修复 ConfigSchema 类型安全问题 (P2)
2. 清理 @deprecated 标记 (P3)

### 中期 (1-2 月)
1. 解决静态/动态导入混用问题 (P2)
2. 优化主包大小 (P2)
3. 优化临时 DOM 元素使用 (P3)

### 长期 (3-6 月)
1. 实现认证和权限系统 (P1)
2. 执行 LegacyAdapter 移除计划 (P3)

---

## 附录: 检查方法

### 构建检查
```bash
npm run build
```

### 代码扫描
```bash
# 搜索技术债务标记
grep -r "TODO\|FIXME\|HACK\|XXX\|TEMP\|@deprecated" src/

# 搜索硬编码和临时代码
grep -r "hardcoded\|临时\|暂时\|待优化\|待重构" src/
```

### 运行时验证
- 启动开发服务器
- 使用 Playwright 进行自动化测试
- 检查控制台日志和网络请求

---

**报告生成**: 自动化脚本 + 人工审查  
**下次审查**: 2026-03-15
