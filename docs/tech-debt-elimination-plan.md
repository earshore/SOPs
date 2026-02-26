# 技术债务清理计划

**制定时间**: 2026-02-26  
**目标**: 消除影响代码质量的技术债务，提升项目可维护性  
**预计周期**: 8周  
**风险等级**: 低-中

---

## 一、债务优先级评估

### 评估维度

| 债务项 | 影响范围 | 清理难度 | 收益 | 优先级 |
|--------|---------|---------|------|--------|
| StateManager 移除 | 全局 | 低 | 高 | P0 |
| 手动状态同步迁移 | 3个模块 | 中 | 高 | P0 |
| 认证系统实现 | 全局 | 高 | 高 | P1 |
| 模块间解耦 | 2个模块 | 中 | 中 | P2 |
| PurgeCSS 配置 | 构建 | 低 | 中 | P2 |
| TODO 标记清理 | 局部 | 低 | 低 | P3 |

### 优先级定义

- **P0 (立即执行)**: 影响代码质量和可维护性，清理难度低-中
- **P1 (短期执行)**: 影响系统完整性，需要设计和实现
- **P2 (中期执行)**: 优化项，提升性能和架构质量
- **P3 (长期执行)**: 代码清洁度，可在日常开发中处理

---

## 二、P0 任务：核心债务清理 (第1-3周)

### 任务 1: 完全移除 StateManager (第1周)

**目标**: 彻底清理旧的状态管理代码，统一使用 Zustand

#### 1.1 验证阶段 (1天)

**检查清单**:
```bash
# 1. 检查生产代码中的 StateManager 使用
grep -r "import.*StateManager" src/modules src/common \
  --include="*.ts" --include="*.tsx" \
  | grep -v "WorkingStateManager" \
  | grep -v "node_modules"

# 2. 检查旧状态访问模式
grep -r "import state from.*common/state" src/modules src/common \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules"

# 3. 检查 state.xxx 直接访问
grep -r "state\.\(ui\|scraper\|analysis\)" src/modules src/common \
  --include="*.ts" --include="*.tsx" \
  | grep -v "appStore.getState()" \
  | grep -v "node_modules"
```

**预期结果**: 所有检查返回 0 条结果

#### 1.2 删除阶段 (2天)

**删除文件清单**:
```
src/common/state/StateMigration.ts          # 兼容层
src/common/state.ts                         # 旧状态导出
src/common/infrastructure/StateManager.ts   # StateManager 类
src/common/infrastructure/middleware/       # 中间件目录
  ├── loggerMiddleware.ts
  ├── persistMiddleware.ts
  ├── validationMiddleware.ts
  └── index.ts
```

**执行步骤**:
```bash
# 1. 备份文件 (以防万一)
mkdir -p .backup/state-manager
cp -r src/common/state* .backup/state-manager/
cp -r src/common/infrastructure/StateManager.ts .backup/state-manager/
cp -r src/common/infrastructure/middleware .backup/state-manager/

# 2. 删除文件
rm -rf src/common/state/StateMigration.ts
rm -rf src/common/state.ts
rm -rf src/common/infrastructure/StateManager.ts
rm -rf src/common/infrastructure/middleware/

# 3. 更新导入语句 (如果有遗漏)
# 手动检查并修复任何导入错误
```

#### 1.3 测试阶段 (2天)

**测试清单**:
- [ ] 编译通过 (`npm run type-check`)
- [ ] 所有模块正常加载
- [ ] 状态读写功能正常
- [ ] 状态持久化正常
- [ ] 浏览器刷新后状态恢复
- [ ] 手动回归测试所有主要功能

**验收标准**:
- ✅ 无编译错误
- ✅ 无运行时错误
- ✅ 所有功能正常
- ✅ 代码库减少约 2000 行

---

### 任务 2: 迁移手动状态同步 (第2-3周) ✅ 已完成

**目标**: 使用 `stateSync` 工具替代手动同步，消除状态不一致风险

#### 2.1 AI Analysis 模块重构 (第2周) ✅

**完成时间**: 2026-02-26

**问题分析**:
- 当前有 23 处 `syncToModuleState()` 调用
- 三层状态管理: Alpine → ModuleState → Zustand
- 代码重复，容易出错

**重构方案**:
```typescript
// ❌ 旧方式 (23行代码)
init() {
  this.selectedAsins = moduleState.selectedAsins;
  this.selectedTargets = moduleState.selectedTargets;
  // ... 更多字段
}

syncFromModuleState() {
  this.selectedAsins = [...moduleState.selectedAsins];
  // ... 更多字段
}

syncToModuleState() {
  moduleState.selectedAsins = this.selectedAsins;
  // ... 更多字段
}

// ✅ 新方式 (6行代码)
init() {
  this._unsubscribes = createMultipleStateSyncs([
    { 
      selector: (s) => s.analysis.selectedAsins, 
      onChange: (v) => { this.selectedAsins = v; } 
    },
    { 
      selector: (s) => s.analysis.isAnalyzing, 
      onChange: (v) => { this.selectedTargets = v; } 
    }
  ]);
}

destroy() {
  cleanupSubscriptions(this._unsubscribes);
}
```

**执行步骤**:

1. **重构 AlpinePanel.ts** (2天)
   ```typescript
   // 文件: src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts
   
   // 1. 移除 syncToModuleState/syncFromModuleState 方法
   // 2. 在 init() 中使用 createMultipleStateSyncs
   // 3. 在 destroy() 中清理订阅
   // 4. 移除所有手动同步调用
   ```

2. **重构其他组件** (2天)
   - actions.ts
   - dataLoaders.ts
   - helpers.ts
   - computedProperties.ts

3. **删除 ModuleState** (1天)
   ```bash
   # 删除中间状态层
   rm src/modules/app_center/views/master_analysis/ai_analysis/state/moduleState.ts
   
   # 更新所有导入
   # 将 moduleState.xxx 替换为 appStore.getState().analysis.xxx
   ```

4. **测试验证** (2天)
   - [ ] 状态读写正常
   - [ ] 组件间状态同步正常
   - [ ] 无内存泄漏 (检查订阅清理)
   - [ ] 性能无退化

**验收标准**:
- ✅ 代码减少 74%
- ✅ 无状态同步 bug
- ✅ 所有测试通过

#### 2.2 Scraper 模块重构 (第3周)

**重构文件**:
- `src/modules/app_center/views/master_analysis/scraper/components/ScraperPanel.ts`
- `src/modules/app_center/views/master_analysis/scraper/components/HistoryPanel.ts`

**执行步骤**: 同 AI Analysis 模块

**验收标准**: 同上

---

## 三、P1 任务：认证系统实现 (第4-5周)

### 任务 3: 实现 JWT 认证系统

**目标**: 实现完整的用户认证和权限控制

#### 3.1 设计阶段 (2天)

**系统设计**:
```
┌─────────────────────────────────────────┐
│          AuthService (核心)              │
├─────────────────────────────────────────┤
│ - login(username, password)             │
│ - logout()                              │
│ - refreshToken()                        │
│ - isAuthenticated()                     │
│ - getCurrentUser()                      │
│ - getToken()                            │
└─────────────────────────────────────────┘
         ↓                    ↓
┌──────────────────┐  ┌──────────────────┐
│  TokenStorage    │  │  UserStore       │
│  (localStorage)  │  │  (Zustand)       │
└──────────────────┘  └──────────────────┘
```

**数据结构**:
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

#### 3.2 实现阶段 (5天)

**文件结构**:
```
src/services/auth/
├── AuthService.ts           # 核心服务
├── TokenStorage.ts          # Token 存储
├── types.ts                 # 类型定义
└── index.ts                 # 导出

src/stores/
└── useAuthStore.ts          # 认证状态管理

src/common/router/
└── RouteGuard.ts            # 更新认证守卫
```

**实现要点**:

1. **AuthService.ts** (2天)
   ```typescript
   export class AuthService {
     private tokenStorage: TokenStorage;
     
     async login(username: string, password: string): Promise<User> {
       // 1. 调用登录 API
       // 2. 保存 token
       // 3. 更新用户状态
       // 4. 返回用户信息
     }
     
     async logout(): Promise<void> {
       // 1. 清除 token
       // 2. 清除用户状态
       // 3. 重定向到登录页
     }
     
     async refreshToken(): Promise<string> {
       // 1. 使用 refreshToken 获取新 token
       // 2. 更新存储
       // 3. 返回新 token
     }
     
     isAuthenticated(): boolean {
       const token = this.tokenStorage.getToken();
       return token !== null && !this.isTokenExpired(token);
     }
   }
   ```

2. **useAuthStore.ts** (1天)
   ```typescript
   interface AuthStore {
     user: User | null;
     token: string | null;
     isAuthenticated: boolean;
     
     setUser: (user: User) => void;
     setToken: (token: string) => void;
     clearAuth: () => void;
   }
   ```

3. **RouteGuard.ts 更新** (1天)
   ```typescript
   async function checkAuthentication(): Promise<boolean> {
     const authService = container.resolve<AuthService>('authService');
     
     if (!authService.isAuthenticated()) {
       // 重定向到登录页
       router.navigate('login', { replace: true });
       return false;
     }
     
     return true;
   }
   ```

4. **HTTP 拦截器** (1天)
   ```typescript
   // 请求拦截器: 添加 token
   httpClient.interceptors.request.use((config) => {
     const token = authService.getToken();
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   
   // 响应拦截器: 处理 401
   httpClient.interceptors.response.use(
     (response) => response,
     async (error) => {
       if (error.response?.status === 401) {
         // 尝试刷新 token
         try {
           await authService.refreshToken();
           // 重试原请求
           return httpClient.request(error.config);
         } catch {
           // 刷新失败，跳转登录
           authService.logout();
         }
       }
       throw error;
     }
   );
   ```

#### 3.3 集成阶段 (3天)

**集成清单**:
- [ ] 注册 AuthService 到 DI 容器
- [ ] 创建登录页面组件
- [ ] 更新路由配置 (添加 requiresAuth meta)
- [ ] 添加登出按钮
- [ ] 添加用户信息显示

**测试清单**:
- [ ] 登录流程正常
- [ ] 登出流程正常
- [ ] Token 自动刷新
- [ ] 401 自动跳转登录
- [ ] 路由守卫生效
- [ ] 持久化登录状态

**验收标准**:
- ✅ 完整的认证流程
- ✅ 安全的 token 管理
- ✅ 自动刷新机制
- ✅ 所有测试通过

---

## 四、P2 任务：架构优化 (第6-7周)

### 任务 4: 模块间解耦 (第6周)

**目标**: 使用事件总线解耦 AI Analysis 和 Scraper 模块

#### 4.1 实现事件总线解耦 (3天)

**当前问题**:
```typescript
// ❌ AI Analysis 直接依赖 Scraper 状态
const scrapedData = appStore.getState().scraper.scrapedData;
```

**解耦方案**:
```typescript
// ✅ 使用事件总线
// Scraper 模块
eventBus.emit('scraper:completed', {
  data: scrapedData,
  timestamp: Date.now(),
  historyId: currentHistoryId
});

// AI Analysis 模块
eventBus.on('scraper:completed', (payload) => {
  this.loadScraperData(payload.data);
  this.historyId = payload.historyId;
});
```

**实现步骤**:

1. **定义事件类型** (1天)
   ```typescript
   // src/common/constants/eventConstants.ts
   export const SCRAPER_EVENTS = {
     STARTED: 'scraper:started',
     PROGRESS: 'scraper:progress',
     COMPLETED: 'scraper:completed',
     FAILED: 'scraper:failed'
   } as const;
   
   export interface ScraperCompletedPayload {
     data: ScrapedData;
     timestamp: number;
     historyId: string;
   }
   ```

2. **Scraper 模块发布事件** (1天)
   ```typescript
   // src/modules/.../scraper/index.ts
   async function handleScraperComplete(data: ScrapedData) {
     // 保存到状态
     appStore.getState().setScrapedData(data);
     
     // 发布事件
     eventBus.emit(SCRAPER_EVENTS.COMPLETED, {
       data,
       timestamp: Date.now(),
       historyId: currentHistoryId
     });
   }
   ```

3. **AI Analysis 模块订阅事件** (1天)
   ```typescript
   // src/modules/.../ai_analysis/index.ts
   init() {
     // 订阅 Scraper 完成事件
     this._unsubscribe = eventBus.on(
       SCRAPER_EVENTS.COMPLETED,
       this.handleScraperData.bind(this)
     );
   }
   
   handleScraperData(payload: ScraperCompletedPayload) {
     this.scrapedData = payload.data;
     this.historyId = payload.historyId;
     // 触发 UI 更新
   }
   
   destroy() {
     this._unsubscribe?.();
   }
   ```

#### 4.2 测试验证 (2天)

**测试清单**:
- [ ] Scraper 完成后事件正常发布
- [ ] AI Analysis 正常接收事件
- [ ] 数据传递完整
- [ ] 无内存泄漏
- [ ] 性能无退化

**验收标准**:
- ✅ 模块间无直接状态依赖
- ✅ 事件驱动架构
- ✅ 易于测试和维护

---

### 任务 5: 配置 PurgeCSS (第7周)

**目标**: 减少生产环境 CSS 体积 30-40%

#### 5.1 配置阶段 (2天)

**配置文件**: `postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? {
      '@fullhuman/postcss-purgecss': {
        content: [
          './index.html',
          './src/**/*.{ts,js,html}',
          './src/modules/**/views/**/*.html'
        ],
        safelist: {
          // 标准白名单
          standard: [
            /^alpine-/,
            /^x-/,
            /data-/,
            'hidden',
            'block',
            'flex',
            'grid'
          ],
          // 深度白名单 (包含子元素)
          deep: [
            /^toast-/,
            /^modal-/,
            /^dropdown-/,
            /^menu-/
          ],
          // 贪婪白名单 (包含所有变体)
          greedy: [
            /^animate-/,
            /^transition-/,
            /^duration-/,
            /^ease-/
          ]
        },
        // 自定义提取器
        defaultExtractor: content => {
          const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
          const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
          return broadMatches.concat(innerMatches);
        }
      }
    } : {})
  }
};
```

#### 5.2 测试阶段 (3天)

**测试流程**:
```bash
# 1. 构建生产版本
npm run build

# 2. 检查 CSS 体积
ls -lh dist/assets/css/*.css

# 3. 启动预览服务器
npm run preview

# 4. 手动测试所有页面
# - 检查样式是否正常
# - 检查动画是否正常
# - 检查响应式布局
# - 检查动态加载的组件
```

**问题排查**:
```bash
# 如果发现样式丢失，添加到 safelist
# 1. 找到丢失的类名
# 2. 添加到 safelist.standard 或 safelist.deep
# 3. 重新构建测试
```

**验收标准**:
- ✅ CSS 体积减少 30-40%
- ✅ 所有页面样式正常
- ✅ 动画和过渡正常
- ✅ 响应式布局正常

---

## 五、P3 任务：代码清洁 (第8周)

### 任务 6: TODO 标记清理

**目标**: 清理所有 TODO/FIXME 标记

#### 6.1 TODO 清单

**统计结果**: 8 处标记

**分类处理**:

1. **配置优化** (已在任务5完成)
   - ✅ `postcss.config.js:6` - PurgeCSS 配置

2. **认证系统** (已在任务3完成)
   - ✅ `RouteGuard.ts:307` - 认证逻辑

3. **示例数据** (保留或更新)
   - `mockData.ts` - 5处 Mock ASIN
   - 决策: 更新为更真实的示例数据

4. **注释说明** (补充文档)
   - 补充函数用途说明

#### 6.2 执行步骤 (2天)

```bash
# 1. 查找所有 TODO
grep -rn "TODO\|FIXME\|XXX\|HACK" src/ \
  --include="*.ts" --include="*.js" \
  > todo-list.txt

# 2. 逐个处理
# - 完成功能实现
# - 或删除过时的 TODO
# - 或转换为 GitHub Issue

# 3. 验证
grep -rn "TODO\|FIXME\|XXX\|HACK" src/ \
  --include="*.ts" --include="*.js"
# 预期: 0 条结果
```

**验收标准**:
- ✅ 所有 TODO 已处理
- ✅ 代码注释完整
- ✅ 无遗留标记

---

## 六、质量保证措施

### 6.1 代码审查清单

每个任务完成后，进行代码审查：

- [ ] **编译检查**: `npm run type-check` 通过
- [ ] **Lint 检查**: `npm run lint` 无错误
- [ ] **格式检查**: `npm run format:check` 通过
- [ ] **构建检查**: `npm run build` 成功
- [ ] **功能测试**: 手动测试所有相关功能
- [ ] **性能测试**: 无性能退化
- [ ] **文档更新**: 更新相关文档

### 6.2 回归测试清单

**核心功能测试**:
- [ ] 首页加载正常
- [ ] 模块切换正常
- [ ] Scraper 功能正常
- [ ] AI Analysis 功能正常
- [ ] PromptLab 功能正常
- [ ] QALab 功能正常
- [ ] Keyword Hunter 功能正常
- [ ] 状态持久化正常
- [ ] 路由导航正常

**性能测试**:
- [ ] 首屏加载时间 < 2s
- [ ] 模块切换时间 < 500ms
- [ ] LLM 调用响应正常
- [ ] 无内存泄漏

### 6.3 文档更新清单

**需要更新的文档**:
- [ ] `README.md` - 更新架构说明
- [ ] `docs/architecture-analysis-report-2026-02-26.md` - 标记已完成
- [ ] `docs/best-practices.md` - 添加新的最佳实践
- [ ] `examples/` - 更新示例代码
- [ ] API 文档 - 更新认证相关 API

---

## 七、风险管理

### 7.1 风险识别

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| 状态同步迁移引入 bug | 中 | 高 | 充分测试，保留回滚方案 |
| 认证系统设计不当 | 低 | 高 | 参考成熟方案，代码审查 |
| PurgeCSS 误删样式 | 中 | 中 | 详细测试，维护白名单 |
| 时间超期 | 中 | 低 | 预留缓冲时间，优先级调整 |

### 7.2 回滚方案

**备份策略**:
```bash
# 每个任务开始前创建备份
git checkout -b backup/task-{N}-{date}
git push origin backup/task-{N}-{date}

# 如果出现问题，可以快速回滚
git checkout main
git reset --hard backup/task-{N}-{date}
```

**分支策略**:
```
main (生产分支)
  ↓
develop (开发分支)
  ↓
feature/task-1-remove-statemanager
feature/task-2-state-sync-migration
feature/task-3-auth-system
feature/task-4-module-decoupling
feature/task-5-purgecss
feature/task-6-todo-cleanup
```

---

## 八、成功指标

### 8.1 量化指标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|---------|
| 代码行数 | ~50,000 | -2,000 | `cloc src/` |
| 技术债务数量 | 6项 | 0项 | 手动统计 |
| TODO 标记 | 8处 | 0处 | `grep TODO` |
| CSS 体积 | ~200KB | <140KB | `ls -lh dist/` |
| 首屏加载时间 | ~2.5s | <2s | Lighthouse |
| 代码重复率 | ~5% | <3% | `jscpd` |

### 8.2 质量指标

- ✅ 所有编译检查通过
- ✅ 所有 Lint 检查通过
- ✅ 所有功能测试通过
- ✅ 无已知 bug
- ✅ 文档完整更新
- ✅ 代码审查通过

---

## 九、时间表

### 甘特图

```
Week 1: [████████] Task 1: StateManager 移除
Week 2: [████████] Task 2.1: AI Analysis 重构
Week 3: [████████] Task 2.2: Scraper 重构
Week 4: [████████] Task 3.1: 认证系统设计+实现
Week 5: [████████] Task 3.2: 认证系统集成+测试
Week 6: [████████] Task 4: 模块间解耦
Week 7: [████████] Task 5: PurgeCSS 配置
Week 8: [████████] Task 6: TODO 清理 + 总结
```

### 里程碑

- **Week 1 结束**: StateManager 完全移除 ✅
- **Week 3 结束**: 状态同步完全迁移 ✅
- **Week 5 结束**: 认证系统上线 ✅
- **Week 7 结束**: 架构优化完成 ✅
- **Week 8 结束**: 所有技术债务清理完成 ✅

---

## 十、总结

本计划系统化地清理了所有影响代码质量的技术债务，预计 8 周完成。

**预期收益**:
- 代码库减少 2000+ 行
- 技术债务清零
- 代码质量显著提升
- 系统架构更加清晰
- 开发效率提升 30%

**执行建议**:
1. 严格按照优先级执行
2. 每个任务完成后进行代码审查
3. 保持充分的测试覆盖
4. 及时更新文档
5. 遇到问题及时调整计划

**下一步**: 开始执行 Week 1 任务 - StateManager 移除
