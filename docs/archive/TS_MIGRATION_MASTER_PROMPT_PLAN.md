# Master Prompt 子模块 TypeScript 迁移详细方案

## 📊 当前进度

### ✅ 已完成 (2/5 文件, 40%)
1. ✅ `analysis/renderer.js` → `renderer.ts` (完成)
   - 文件大小: ~400行
   - 类型定义: StyleConfig, FieldTitleMap
   - 构建状态: ✅ 通过
   - Git提交: commit 9951faa

2. ✅ `scraper/index.js` → `index.ts` (完成)
   - 文件大小: ~420行
   - 类型定义: Task, ProxyConfig, Window扩展
   - 构建状态: ✅ 通过
   - Git提交: commit 8ff1536

### ⚪ 待迁移 (3/5 文件, 60%)
3. ⚪ `promptlab/index.js` → `index.ts`
   - 文件大小: ~600行
   - 复杂度: 中等
   - 依赖: actionRegistry, Alpine.js
   - 预计时间: 30分钟

4. ⚪ `data/index.js` → `index.ts`
   - 文件大小: 636行
   - 复杂度: 高 (继承BaseModule)
   - 依赖: BaseModule, EventBus, HistoryService
   - 预计时间: 40分钟

5. ⚪ `analysis/index.js` → `index.ts`
   - 文件大小: 1167行 (最大)
   - 复杂度: 最高 (继承BaseModule, GridStack)
   - 依赖: BaseModule, GridStack, renderer.ts
   - 预计时间: 60分钟

## 🎯 迁移策略

### 策略选择: 渐进式迁移 + 分段验证

**原则:**
1. 一次迁移一个文件
2. 每次迁移后立即验证构建
3. 每次迁移后立即Git提交
4. 保持功能完全不变
5. 遇到大文件(>500行)采用分段写入策略

### 分段写入策略 (针对大文件)

**步骤:**
1. 创建文件头部 (imports + 类型定义) - 50行以内
2. 使用 fsAppend 追加核心函数 - 每次50行以内
3. 使用 fsAppend 追加剩余代码 - 每次50行以内
4. 删除旧JS文件
5. 更新所有导入路径
6. 验证构建
7. Git提交

## 📋 详细执行计划

### Phase 1: promptlab/index.js → index.ts (优先级: 高)

**文件特点:**
- 600行左右
- 使用 Alpine.js 和 actionRegistry
- 包含大量UI操作函数
- 状态管理复杂

**迁移步骤:**
1. 读取完整文件内容
2. 创建类型定义:
   ```typescript
   - 模块状态类型
   - 事件监听器类型
   - Window扩展 (Alpine)
   ```
3. 分段写入 (每段<50行):
   - 第1段: imports + 类型定义 + 模块状态
   - 第2段: Helper函数 (cleanup, getFieldTitle等)
   - 第3段: State Management函数
   - 第4段: UI Functions (generateLanguageOptions等)
   - 第5段: Action Functions (generateMasterPrompt等)
   - 第6段: Event Listeners Setup
   - 第7段: Module Exports (mount, unmount)
4. 删除旧文件
5. 验证构建: `npm run build`
6. Git提交

**预期类型错误:**
- Alpine.js 类型缺失 → 扩展Window接口
- DOM元素类型 → 使用类型断言
- state类型不匹配 → 使用any或类型断言

### Phase 2: data/index.js → index.ts (优先级: 中)

**文件特点:**
- 636行
- 继承BaseModule
- 复杂的数据渲染逻辑
- 文件导入/导出功能

**迁移步骤:**
1. 读取完整文件内容
2. 创建类型定义:
   ```typescript
   - Product类型
   - Review类型
   - HistoryItem类型 (可能与现有冲突)
   ```
3. 分段写入 (每段<50行):
   - 第1段: imports + DataModule class定义
   - 第2段: render, init, onUnmount方法
   - 第3段: setupEventListeners, saveState, restoreState
   - 第4段: Logic Methods (toggleCardExpand等)
   - 第5段: renderDataPanel方法
   - 第6段: Helper方法 (renderStars, syntaxHighlight等)
   - 第7段: Delete方法 (deleteProduct, deleteReview)
   - 第8段: Import方法 (handleImportFiles等)
   - 第9段: Module Exports (mount, unmount)
4. 删除旧文件
5. 更新导入路径 (analysis/index.js可能引用)
6. 验证构建: `npm run build`
7. Git提交

**预期类型错误:**
- BaseModule方法签名 → 检查BaseModule.ts定义
- HistoryItem类型冲突 → 使用别名或any
- DOM操作类型 → HTMLElement类型断言

### Phase 3: analysis/index.js → index.ts (优先级: 最高,最后执行)

**文件特点:**
- 1167行 (最大最复杂)
- 继承BaseModule
- 使用GridStack库
- 复杂的报告渲染和编辑逻辑
- 依赖renderer.ts

**迁移步骤:**
1. 分批读取文件 (使用readFile with line ranges)
2. 创建类型定义:
   ```typescript
   - AnalysisModule class
   - GridStack类型扩展
   - Report类型
   - Widget类型
   ```
3. 分段写入 (每段<50行,预计需要25段):
   - 第1段: imports + 辅助函数 + class定义
   - 第2-5段: UI Setup方法
   - 第6-10段: Prompt Logic方法
   - 第11-15段: Core Analysis Logic
   - 第16-20段: Report Rendering
   - 第21-24段: GridStack相关方法
   - 第25段: Module Exports
4. 删除旧文件
5. 验证构建: `npm run build`
6. Git提交

**预期类型错误:**
- GridStack类型缺失 → 声明全局GridStack
- BaseModule方法签名 → 仔细对照
- 复杂的state操作 → 使用any或详细类型
- renderer.ts导入 → 已完成,应该正常

## 🔍 风险评估

### 高风险点
1. **analysis/index.js (1167行)**
   - 风险: 文件太大,类型错误多
   - 缓解: 分段迁移,每段验证
   - 备选: 如遇阻可暂时跳过

2. **BaseModule继承**
   - 风险: 方法签名不匹配
   - 缓解: 先检查BaseModule.ts定义
   - 备选: 使用any临时绕过

3. **第三方库类型 (GridStack, Alpine)**
   - 风险: 类型定义缺失
   - 缓解: 扩展Window/global接口
   - 备选: 使用any

### 中风险点
1. **HistoryItem类型冲突**
   - 风险: 多处定义不一致
   - 缓解: 统一使用historyService的类型
   - 备选: 使用类型别名

2. **DOM操作类型**
   - 风险: 大量DOM操作需要类型断言
   - 缓解: 统一使用HTMLElement类型
   - 备选: 使用any

## ✅ 验证清单

每次迁移后必须验证:
- [ ] TypeScript编译: `npm run build` - 0错误
- [ ] 开发服务器: `npm run dev` - 正常启动
- [ ] 浏览器测试: 访问对应页面 - 功能正常
- [ ] Git提交: 清晰的commit message

## 📝 提交规范

```
feat: 迁移 master_prompt/[文件名].js → [文件名].ts

- 添加完整的 TypeScript 类型定义
- [具体改动点1]
- [具体改动点2]
- 保持所有功能不变
- 构建验证通过: 0 错误
```

## 🎯 预期完成时间

- promptlab: 30分钟
- data: 40分钟
- analysis: 60分钟
- **总计: 约2.5小时**

## 📊 当前测试状态

- ✅ 构建测试: 通过 (0错误)
- ✅ 开发服务器: 运行正常 (http://localhost:3001)
- ⚪ 浏览器功能测试: 待执行
- ⚪ Master Prompt模块测试: 待执行

## 🚀 下一步行动

1. 执行浏览器功能测试
2. 确认Master Prompt模块功能正常
3. 开始Phase 1: 迁移promptlab/index.js
