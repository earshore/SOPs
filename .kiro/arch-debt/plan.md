# 架构债务修复计划

**制定时间**: 2024年
**当前分支**: `refactor/eliminate-architecture-debt`
**已完成**: Common目录（16个文件）

---

## 📊 整体策略

### 修复原则
1. **保守优先**: 每批5-6个文件，确保安全可控
2. **独立优先**: 优先处理依赖少、影响范围小的模块
3. **业务优先**: 先修复业务模块，再处理核心服务
4. **验证充分**: 每批修复后必须通过构建验证

### 风险控制
- **低风险批次**: 独立业务模块，无核心依赖
- **中风险批次**: 有模块间依赖，但影响可控
- **高风险批次**: 核心服务，需要特别小心

### 回滚策略
- 每批修复在独立commit中
- 出现问题立即 `git revert`
- 保持分支可随时回退到稳定状态

---

## 🎯 第一批修复计划

### 批次信息
- **文件数量**: 6个文件
- **风险等级**: 低风险
- **优先级**: P1-P2
- **预计影响**: 独立业务模块，影响范围可控
- **依赖关系**: 无核心依赖

### 修复清单

#### 1. `src/modules/app_center/views/master_analysis/services/analysisService.ts`
- **债务类型**: 错误处理
- **问题**: 1处使用 `throw new Error()`
- **修复方案**: 
  ```typescript
  // 修改前
  throw new Error("无法从响应中解析有效的 JSON 数据");
  
  // 修改后
  import { ApiError } from '@common/errors/AppError';
  throw new ApiError('无法从响应中解析有效的 JSON 数据', 'ANALYSIS_001');
  ```
- **影响范围**: AI分析服务
- **风险评估**: 低 - 独立服务模块

#### 2. `src/modules/app_center/views/keyword_hunter/services/trackerService.ts`
- **债务类型**: 错误处理
- **问题**: 4处使用 `throw new Error()`
- **修复方案**:
  ```typescript
  // 配置错误
  throw new ValidationError("请先在全局设置中选择 LLM 提供商", 'TRACKER_001');
  throw new ValidationError("所选提供商未配置 API Key", 'TRACKER_002');
  throw new ValidationError("未选择模型，请在设置中同步或选择模型", 'TRACKER_003');
  
  // 业务错误
  throw new BusinessError("文案内容为空，无法进行AI分析", 'TRACKER_004');
  throw new BusinessError("输入内容过短或不具备特征", 'TRACKER_005');
  ```
- **影响范围**: Keyword Hunter追踪服务
- **风险评估**: 低 - 独立功能模块

#### 3. `src/modules/app_center/views/master_analysis/qalab/services/rufusSimulator.ts`
- **债务类型**: 错误处理
- **问题**: 2处使用 `throw new Error()`
- **修复方案**:
  ```typescript
  import { ValidationError } from '@common/errors/AppError';
  
  throw new ValidationError('未配置 LLM 服务', 'RUFUS_001');
  throw new ValidationError('LLM 配置不完整', 'RUFUS_002');
  ```
- **影响范围**: QALab Rufus模拟器
- **风险评估**: 低 - 独立功能模块

#### 4. `src/common/router/navigo/PreloadManager.ts`
- **债务类型**: 错误处理
- **问题**: 1处使用 `new Error()` (超时错误)
- **修复方案**:
  ```typescript
  import { SystemError } from '@common/errors/AppError';
  
  setTimeout(() => reject(new SystemError('Preload timeout', 'PRELOAD_001')), timeout);
  ```
- **影响范围**: 路由预加载
- **风险评估**: 低 - 工具模块

#### 5. `src/common/utils/WorkingStateManager.ts`
- **债务类型**: 错误处理
- **问题**: 2处使用 `new Error()` (超时错误)
- **修复方案**:
  ```typescript
  import { SystemError } from '@common/errors/AppError';
  
  this.setFailure(id, new SystemError(`任务超时，已重试${currentState.maxRetries}次仍失败`, 'WORK_STATE_001'));
  const error = new SystemError(`任务超时，已达到最大重试次数 (${state.maxRetries})`, 'WORK_STATE_002');
  ```
- **影响范围**: 工作状态管理
- **风险评估**: 低 - 工具模块

#### 6. `src/modules/app_center/views/master_analysis/ai_analysis/services/parallelAnalysisService.ts`
- **债务类型**: 存储访问
- **问题**: 1处使用 `localStorage.getItem`
- **修复方案**:
  ```typescript
  // 修改前
  const value = localStorage.getItem(key);
  
  // 修改后
  import { StorageService } from '@services/storageService';
  const value = StorageService.getRaw(key);
  ```
- **影响范围**: 并行分析服务缓存检查
- **风险评估**: 低 - 简单读取操作

### 验证方式
```bash
# 构建验证
npm run build

# 类型检查
npm run type-check

# 如果有相关测试
npm run test
```

### 预期结果
- ✅ 所有文件使用统一的AppError体系
- ✅ 错误信息更加规范和可追踪
- ✅ 构建和类型检查通过
- ✅ 无功能回归

---

## 🔄 第二批修复计划（待第一批完成后制定）

### 批次信息
- **批次编号**: Batch #2
- **状态**: ✅ 已规划，等待执行
- **文件数量**: 6个文件
- **风险等级**: 中风险
- **优先级**: P1
- **预计影响**: QALab、Scraper、AI Analysis、Overview模块

### 修复清单

#### 1. `src/modules/app_center/views/master_analysis/qalab/services/importHandler.ts`
- **债务类型**: 错误处理 + 事件机制
- **问题**: 
  - 7处使用 `throw new Error()`
  - 1处触发 `qalab:data-imported` 事件
- **修复方案**:
  - 错误处理: 根据错误类型分类（ValidationError、ApiError、BusinessError）
  - 事件机制: 需要在 `APP_EVENTS` 中新增 `QALAB_DATA_IMPORTED` 常量
- **风险评估**: 中风险 - 数据导入核心逻辑
- **依赖关系**: 被 qalab/index.ts 监听

#### 2. `src/modules/app_center/views/master_analysis/scraper/handlers/dataOperations.ts`
- **债务类型**: 错误处理 + 事件机制
- **问题**: 
  - 14处使用 `throw new Error()`
  - 2处触发 `HISTORY_UPDATED` 事件
- **修复方案**:
  - 错误处理: 根据错误类型分类
  - 事件机制: `window.dispatchEvent` → `eventBus.emit(APP_EVENTS.HISTORY_UPDATED)`
- **风险评估**: 中风险 - Scraper核心数据操作
- **依赖关系**: 被 ScraperPanel 和 importHandler 调用

#### 3. `src/modules/app_center/views/master_analysis/qalab/index.ts`
- **债务类型**: 事件机制
- **问题**: 监听 `qalab:data-imported` 事件
- **修复方案**: 
  ```typescript
  // 修改前
  window.addEventListener('qalab:data-imported', handler);
  
  // 修改后
  const unsubscribe = eventBus.on(APP_EVENTS.QALAB_DATA_IMPORTED, handler);
  ```
- **风险评估**: 中风险 - 必须与 importHandler 配对修复
- **依赖关系**: 与 importHandler 配合使用

#### 4. `src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts`
- **债务类型**: 事件机制
- **问题**: 触发 `history-updated` 事件
- **修复方案**:
  ```typescript
  // 修改前
  window.dispatchEvent(new CustomEvent('history-updated'));
  
  // 修改后
  eventBus.emit(APP_EVENTS.HISTORY_UPDATED);
  ```
- **风险评估**: 中风险 - 影响历史记录更新
- **依赖关系**: 被其他组件监听

#### 5. `src/modules/app_center/views/overview/index.ts`
- **债务类型**: 事件机制（已部分使用APP_EVENTS）
- **问题**: 2处使用 `window.dispatchEvent` 触发 `APP_EVENTS.ROUTE_CHANGE`
- **修复方案**:
  ```typescript
  // 修改前
  window.dispatchEvent(new CustomEvent(APP_EVENTS.ROUTE_CHANGE, { detail }));
  
  // 修改后
  eventBus.emit(APP_EVENTS.ROUTE_CHANGE, detail);
  ```
- **风险评估**: 中风险 - 影响页面导航
- **依赖关系**: 路由系统
- **注意**: 已经使用 APP_EVENTS 常量，只需改用 eventBus

#### 6. `src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts`
- **债务类型**: 事件机制
- **问题**: 监听 `navigate-to-scraper` 事件（可能是未使用的功能）
- **修复方案**:
  ```typescript
  // 修改前
  window.addEventListener('navigate-to-scraper', handler);
  
  // 修改后
  const unsubscribe = eventBus.on(APP_EVENTS.NAVIGATE_TO_SCRAPER, handler);
  ```
- **风险评估**: 低风险 - 该事件目前无触发方，可能是预留功能
- **依赖关系**: 无
- **注意**: 需要确认是否保留此功能

### 修复策略

#### 前置准备
1. 在 `eventConstants.ts` 中新增事件常量：
   ```typescript
   // QALab 相关
   QALAB_DATA_IMPORTED: 'app:qalab-data-imported',
   
   // 导航相关
   NAVIGATE_TO_SCRAPER: 'app:navigate-to-scraper',
   ```

#### 阶段1: 错误处理（2个文件）
1. `importHandler.ts` - QALab数据导入
2. `dataOperations.ts` - Scraper数据操作（仅错误处理部分）

**验证点**:
- 数据导入功能正常
- 错误信息准确
- 构建通过

#### 阶段2: 事件机制（5个文件）
1. 完成 `eventConstants.ts` 新增常量
2. `importHandler.ts` - 完成事件触发部分
3. `qalab/index.ts` - QALab事件监听
4. `dataOperations.ts` - 完成事件触发部分
5. `actions.ts` - AI Analysis事件触发
6. `overview/index.ts` - Overview导航事件
7. `AlpinePanel.ts` - AI Analysis导航监听（可选）

**验证点**:
- 事件触发和监听正常
- 模块间通信正常
- 历史记录更新正常
- 页面导航正常

### 需要新增的事件常量
```typescript
// 在 APP_EVENTS 中新增：
QALAB_DATA_IMPORTED: 'app:qalab-data-imported',
NAVIGATE_TO_SCRAPER: 'app:navigate-to-scraper',
```

### 风险控制
- **配对修复**: importHandler 和 qalab/index.ts 必须同时修复
- **事件清理**: 确保在组件销毁时调用 `unsubscribe()`
- **分阶段验证**: 每个阶段完成后进行功能测试
- **独立commit**: 每个阶段独立提交，便于回滚

### 验证方式
```bash
# 构建验证
npm run build

# 类型检查
npm run type-check

# 功能测试
# - QALab 数据导入
# - Scraper 数据操作
# - 历史记录更新
# - 页面导航
```

---

## 🚨 第三批修复计划（高风险，需特别小心）

### 候选文件（3-4个）
1. `src/services/llmService.ts` - 核心LLM服务
2. `src/main.ts` - 应用初始化
3. `src/services/animation-manager.ts` - 动画管理
4. `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts` - Scraper面板

### 风险评估
- **风险等级**: 高风险
- **原因**: 核心服务，被多个模块依赖
- **注意事项**: 
  - llmService需要全面测试所有依赖模块
  - main.ts的事件改动需要确保应用初始化流程正常
  - 需要更充分的测试和验证

---

## 📝 修复模板

### 错误处理修复模板
```typescript
// 1. 添加导入
import { AppError, NetworkError, ApiError, ValidationError, BusinessError, SystemError } from '@common/errors/AppError';

// 2. 替换错误抛出
// 配置/验证错误
throw new ValidationError('错误描述', 'ERROR_CODE');

// 业务逻辑错误
throw new BusinessError('错误描述', 'ERROR_CODE');

// 系统/运行时错误
throw new SystemError('错误描述', 'ERROR_CODE');

// API/网络错误
throw new ApiError('错误描述', 'ERROR_CODE');
throw new NetworkError('错误描述', 'ERROR_CODE');
```

### 存储访问修复模板
```typescript
// 1. 添加导入
import { StorageService } from '@services/storageService';

// 2. 替换localStorage调用
// 读取
const value = StorageService.get<Type>('key', defaultValue);
const rawValue = StorageService.getRaw('key', defaultValue);

// 写入
StorageService.set('key', value);
StorageService.setRaw('key', stringValue);

// 检查
const exists = StorageService.has('key');

// 删除
StorageService.remove('key');
```

### 事件机制修复模板
```typescript
// 1. 添加导入
import eventBus from '@common/EventBus';
import { APP_EVENTS } from '@common/constants/eventConstants';

// 2. 替换window事件
// 触发事件
// 修改前: window.dispatchEvent(new CustomEvent('event-name', { detail }));
// 修改后:
eventBus.emit(APP_EVENTS.EVENT_NAME, detail);

// 监听事件
// 修改前: window.addEventListener('event-name', handler);
// 修改后:
const unsubscribe = eventBus.on(APP_EVENTS.EVENT_NAME, handler);
// 清理: unsubscribe();
```

---

## 🎯 成功标准

### 每批修复的验证清单
- [ ] 所有文件使用统一的错误类型
- [ ] 所有存储访问使用StorageService
- [ ] 所有应用事件使用EventBus（浏览器原生事件除外）
- [ ] 构建成功 (`npm run build`)
- [ ] 类型检查通过 (`npm run type-check`)
- [ ] 无功能回归
- [ ] 代码审查通过

### 整体项目目标
- [ ] 消除所有不必要的技术债务
- [ ] 建立统一的错误处理体系
- [ ] 建立统一的存储访问层
- [ ] 建立统一的事件通信机制
- [ ] 提高代码可维护性和可追踪性

---

## 📞 沟通机制

### 遇到问题时
1. 立即停止修复
2. 记录问题详情
3. 向用户报告
4. 等待指示后再继续

### 需要用户决策的情况
1. 发现新的技术债务类型
2. 修复方案有多个选择
3. 遇到高风险修改
4. 发现架构设计问题

---

**下一步行动**: 等待用户确认第一批修复计划，确认后开始执行
