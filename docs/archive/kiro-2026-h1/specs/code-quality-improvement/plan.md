# 代码质量改进计划

## 📊 问题概览

- **总问题数**: 1829 个
- **错误**: 1150 个 (63%)
- **警告**: 679 个 (37%)

## 🎯 修复策略

### 阶段 1: 快速修复（1-2 天）
自动修复和简单替换，可以快速减少 30-40% 的问题。

### 阶段 2: 结构优化（1 周）
重构复杂函数，改进代码结构。

### 阶段 3: 类型安全（2 周）
逐步替换 any 类型，提升类型安全。

---

## 🚀 阶段 1: 快速修复（优先级：高）

### 任务 1.1: 自动修复 ESLint 问题
**预计时间**: 30 分钟  
**预计修复**: ~200 个问题

```bash
# 运行自动修复
npm run lint:fix

# 验证修复结果
npm run lint
```

**预期结果**: 自动修复格式、缩进、引号等简单问题。

---

### 任务 1.2: 修复 localStorage 直接访问（安全问题）
**优先级**: 🔴 紧急  
**预计时间**: 2 小时  
**影响文件**: 2 个

#### 需要修复的文件：
1. `src/services/HttpCacheService.ts` (11 处)
2. `src/services/animation-manager.ts` (4 处)

#### 修复方法：
```typescript
// ❌ 错误写法
localStorage.setItem('key', 'value');
const value = localStorage.getItem('key');

// ✅ 正确写法
import { StorageService } from './storageService';
StorageService.setItem('key', 'value');
const value = StorageService.getItem('key');
```

#### 执行步骤：
1. 打开 `HttpCacheService.ts`
2. 导入 `StorageService`
3. 全局替换 `localStorage.` 为 `StorageService.`
4. 测试缓存功能
5. 重复步骤处理 `animation-manager.ts`

---

### 任务 1.3: 批量替换 console 语句
**预计时间**: 4 小时  
**预计修复**: ~500 个错误

#### 高频问题文件（优先处理）：
1. `src/services/llmService.ts` - 45 个 console
2. `src/services/performanceService.ts` - 30 个 console
3. `src/modules/app_center/views/master_analysis/scraper/` - 100+ 个 console

#### 修复方法：
```typescript
// ❌ 错误写法
console.log('Debug info:', data);
console.error('Error:', error);

// ✅ 正确写法
import { loggerService } from '@/services/loggerService';
loggerService.debug('Debug info:', data);
loggerService.error('Error:', error);
```

#### 批量替换脚本：
```bash
# 创建一个临时脚本来批量替换
# 替换 console.log
find src -name "*.ts" -exec sed -i 's/console\.log(/loggerService.debug(/g' {} +

# 替换 console.error
find src -name "*.ts" -exec sed -i 's/console\.error(/loggerService.error(/g' {} +

# 替换 console.warn
find src -name "*.ts" -exec sed -i 's/console\.warn(/loggerService.warn(/g' {} +
```

**注意**: 需要在每个文件顶部添加 `import { loggerService } from '@/services/loggerService';`

---

## 🔧 阶段 2: 结构优化（优先级：中）

### 任务 2.1: 降低函数复杂度
**预计时间**: 1 周  
**目标**: 将复杂度从 37 降到 ≤10

#### 最复杂的函数（优先重构）：

1. **llmService.ts - callLLM()** 
   - 当前复杂度: 37
   - 当前行数: 199
   - 参数数量: 6
   
   **重构策略**:
   - 提取配置对象模式（减少参数）
   - 拆分为多个小函数
   - 使用策略模式处理不同 LLM 提供商

2. **scraperService.ts - fetchWithProxy()**
   - 当前复杂度: 22
   - **重构策略**: 提取重试逻辑、错误处理为独立函数

3. **scraperService.ts - scrapeAsin()**
   - 当前复杂度: 19
   - **重构策略**: 拆分数据解析和验证逻辑

#### 重构模板：
```typescript
// ❌ 复杂函数
async function complexFunction(a, b, c, d, e, f) {
  if (condition1) {
    if (condition2) {
      if (condition3) {
        // 深层嵌套
      }
    }
  }
  // 200 行代码...
}

// ✅ 重构后
interface FunctionConfig {
  a: string;
  b: number;
  c: boolean;
  options: {
    d: string;
    e: number;
    f: boolean;
  };
}

async function simplifiedFunction(config: FunctionConfig) {
  validateConfig(config);
  const result = await processStep1(config);
  return await processStep2(result);
}

function validateConfig(config: FunctionConfig) {
  // 验证逻辑
}

async function processStep1(config: FunctionConfig) {
  // 步骤 1
}

async function processStep2(data: any) {
  // 步骤 2
}
```

---

### 任务 2.2: 拆分超长函数
**预计时间**: 3 天  
**目标**: 所有函数 ≤100 行

#### 需要拆分的函数：
1. `llmService.ts - callLLM()` - 199 行
2. `llmService.ts - fetchModelsFromApi()` - 115 行
3. `httpService.ts - request()` - 118 行
4. `npi_tracker/index.ts - renderTable()` - 106 行
5. `npi_tracker/index.ts - exportToExcel()` - 114 行

#### 拆分原则：
- 单一职责：每个函数只做一件事
- 提取重复逻辑
- 使用辅助函数
- 保持主函数清晰

---

## 📝 阶段 3: 类型安全（优先级：中低）

### 任务 3.1: 替换 any 类型
**预计时间**: 2 周  
**预计修复**: ~300 个警告

#### 高频 any 类型文件：
1. `src/types/events.d.ts` - 40+ 个 any
2. `src/types/global.d.ts` - 15+ 个 any
3. `src/services/llmService.ts` - 10+ 个 any

#### 替换策略：
```typescript
// ❌ 使用 any
function process(data: any): any {
  return data.value;
}

// ✅ 使用具体类型
interface ProcessData {
  value: string;
  timestamp: number;
}

function process(data: ProcessData): string {
  return data.value;
}

// ✅ 使用泛型
function process<T extends { value: string }>(data: T): string {
  return data.value;
}

// ✅ 使用 unknown（需要类型检查）
function process(data: unknown): string {
  if (isProcessData(data)) {
    return data.value;
  }
  throw new Error('Invalid data');
}
```

---

### 任务 3.2: 减少 non-null 断言
**预计时间**: 1 周  
**预计修复**: ~50 个警告

#### 替换策略：
```typescript
// ❌ 使用 non-null 断言
const value = data.value!;
const element = document.querySelector('.class')!;

// ✅ 使用可选链和空值合并
const value = data.value ?? defaultValue;
const element = document.querySelector('.class');
if (element) {
  // 使用 element
}

// ✅ 使用类型守卫
if (data.value !== null && data.value !== undefined) {
  const value = data.value; // TypeScript 知道这里不是 null
}
```

---

## 📅 执行时间表

### 第 1 周
- ✅ 周一: 任务 1.1 - 自动修复
- ✅ 周一-周二: 任务 1.2 - 修复 localStorage
- ✅ 周三-周五: 任务 1.3 - 替换 console（部分）

### 第 2 周
- 🔄 周一-周三: 完成任务 1.3 - 替换 console
- 🔄 周四-周五: 任务 2.1 开始 - 重构 llmService.ts

### 第 3 周
- 🔄 周一-周三: 任务 2.1 继续 - 重构其他复杂函数
- 🔄 周四-周五: 任务 2.2 开始 - 拆分超长函数

### 第 4-5 周
- 🔄 任务 3.1 - 逐步替换 any 类型
- 🔄 任务 3.2 - 减少 non-null 断言

---

## 🎯 成功指标

### 阶段 1 完成后
- [ ] ESLint 错误数 < 700（减少 40%）
- [ ] 无 localStorage 直接访问
- [ ] Console 语句减少 80%

### 阶段 2 完成后
- [ ] 无函数复杂度 > 15
- [ ] 无函数行数 > 120
- [ ] ESLint 错误数 < 400

### 阶段 3 完成后
- [ ] any 类型使用 < 100 个
- [ ] non-null 断言 < 20 个
- [ ] ESLint 错误数 < 200

### 最终目标
- [ ] ESLint 错误数 < 100
- [ ] ESLint 警告数 < 200
- [ ] 代码质量评分 > 90%

---

## 🛠️ 工具和脚本

### 进度跟踪脚本
```bash
# 创建一个脚本来跟踪进度
npm run lint > lint-report-$(date +%Y%m%d).txt

# 对比前后差异
diff lint-report-before.txt lint-report-after.txt
```

### 自动化工具
```bash
# 使用项目现有工具
npm run quality:baseline    # 运行所有质量检查
npm run tech-debt:scan      # 扫描技术债务
npm run code:analyze:complexity  # 分析复杂度
```

---

## 📋 检查清单

### 每次修复后
- [ ] 运行 `npm run lint` 验证
- [ ] 运行 `npm run type-check` 验证类型
- [ ] 运行 `npm run test` 确保功能正常
- [ ] 提交代码前运行 `npm run quality:baseline`

### 每周回顾
- [ ] 统计问题数量变化
- [ ] 更新进度报告
- [ ] 调整优先级（如需要）

---

## 💡 注意事项

1. **渐进式改进**: 不要一次性修改太多文件
2. **保持功能稳定**: 每次修改后都要测试
3. **代码审查**: 重要的重构需要团队审查
4. **文档更新**: 修改后更新相关文档
5. **性能监控**: 确保重构不影响性能

---

## 🤝 需要的支持

- [ ] 团队代码审查时间
- [ ] 测试环境验证
- [ ] 可能需要暂停新功能开发（阶段 2）

---

## 📊 报告模板

### 每周进度报告
```
## 本周完成
- 修复了 X 个错误
- 优化了 Y 个函数
- 减少了 Z% 的代码复杂度

## 遇到的问题
- 问题描述
- 解决方案

## 下周计划
- 任务列表
```

---

**创建日期**: 2026-03-04  
**预计完成日期**: 2026-04-04  
**负责人**: 开发团队  
**状态**: 📋 待开始
