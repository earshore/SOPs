# 快速开始指南

## 🚀 立即开始修复

### 步骤 1: 自动修复（5 分钟）

```bash
# 1. 自动修复简单问题
npm run lint:fix

# 2. 查看剩余问题
npm run lint > current-issues.txt

# 3. 对比改进
echo "修复前: 1829 个问题"
echo "修复后: $(grep -c 'error\|warning' current-issues.txt) 个问题"
```

### 步骤 2: 修复 localStorage（30 分钟）

#### 文件 1: HttpCacheService.ts
```bash
# 打开文件
code src/services/HttpCacheService.ts

# 需要修改的行: 157, 180, 183, 195, 198, 243, 246, 251, 255, 289, 304
```

**修改模板**:
```typescript
// 在文件顶部添加
import { StorageService } from './storageService';

// 替换所有 localStorage 调用
// 查找: localStorage.getItem
// 替换: StorageService.getItem

// 查找: localStorage.setItem
// 替换: StorageService.setItem

// 查找: localStorage.removeItem
// 替换: StorageService.removeItem
```

#### 文件 2: animation-manager.ts
```bash
# 打开文件
code src/services/animation-manager.ts

# 需要修改的行: 133, 144
```

### 步骤 3: 验证修复（5 分钟）

```bash
# 运行 lint 检查
npm run lint -- src/services/HttpCacheService.ts
npm run lint -- src/services/animation-manager.ts

# 运行类型检查
npm run type-check

# 运行测试
npm run test
```

---

## 📊 今天可以完成的任务

### 任务清单
- [ ] 运行自动修复（预计减少 200 个问题）
- [ ] 修复 HttpCacheService.ts 的 localStorage
- [ ] 修复 animation-manager.ts 的 localStorage
- [ ] 验证所有修改
- [ ] 提交代码

### 预期结果
- ✅ 问题数从 1829 降到 ~1600
- ✅ 消除所有 localStorage 安全问题
- ✅ 代码质量提升 12%

---

## 🎯 本周目标

### 周一-周二
- 完成阶段 1 的任务 1.1 和 1.2
- 目标: 减少 250 个问题

### 周三-周五
- 开始替换 console 语句
- 优先处理 llmService.ts 和 performanceService.ts
- 目标: 减少 200 个 console 错误

---

## 💡 快速参考

### 常用命令
```bash
# 检查特定文件
npm run lint -- src/path/to/file.ts

# 自动修复特定文件
npm run lint:fix -- src/path/to/file.ts

# 查看类型错误
npm run type-check

# 运行所有质量检查
npm run quality:baseline
```

### 修复模式速查

#### Console → Logger
```typescript
// Before
console.log('message', data);
console.error('error', error);

// After
import { loggerService } from '@/services/loggerService';
loggerService.debug('message', data);
loggerService.error('error', error);
```

#### localStorage → StorageService
```typescript
// Before
localStorage.setItem('key', value);
const data = localStorage.getItem('key');

// After
import { StorageService } from './storageService';
StorageService.setItem('key', value);
const data = StorageService.getItem('key');
```

#### any → 具体类型
```typescript
// Before
function process(data: any): any {
  return data.value;
}

// After
interface Data {
  value: string;
}
function process(data: Data): string {
  return data.value;
}
```

---

## 🆘 遇到问题？

### 常见问题

**Q: 自动修复后代码不工作了？**
A: 运行 `git diff` 查看改动，使用 `git checkout -- <file>` 恢复特定文件

**Q: 不确定如何修复某个错误？**
A: 查看 ESLint 错误信息中的规则名称，搜索该规则的文档

**Q: 修改后测试失败？**
A: 先恢复改动，然后逐个文件修改并测试

### 获取帮助
- 查看完整计划: `.kiro/specs/code-quality-improvement/plan.md`
- 使用 #code-quality-checker skill
- 运行 `npm run lint -- --help` 查看更多选项
