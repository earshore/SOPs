# 中危漏洞修复 - 剩余工作

## 已修复的文件（TypeScript）

1. ✅ src/common/devtools/PerformanceMonitor.ts
2. ✅ src/common/router/NotFound.ts  
3. ✅ src/common/ui/search.ts
4. ✅ src/common/utils/safeMount.ts
5. ✅ src/common/utils/viewLoader.ts
6. ✅ src/components/ErrorBoundary.ts
7. ✅ src/modules/amz_hub/views/practice/promotions/index.ts
8. ✅ src/modules/sops/views/growth/npi_tracker/index.ts
9. ✅ src/modules/more/views/explore/prompts/index.ts

## 需要手动处理的 HTML 模板文件

这些文件中的内联事件处理器需要在对应的 TypeScript 文件中绑定：

### 1. src/modules/app_center/views/keyword_hunter/analysis/template.html
- 1个 onclick 事件
- 需要在 analysis/index.ts 中绑定

### 2. src/modules/app_center/views/keyword_hunter/process/template.html  
- 4个 onclick 事件
- 需要在 process/index.ts 中绑定

### 3. src/modules/more/views/explore/prompts/template.html
- 5个 onclick 事件
- 需要在 prompts/index.ts 中绑定（部分已修复）

### 4. src/modules/sops/views/service/email_templates/template.html
- 12个 onclick 事件
- 需要在 email_templates/index.ts 中绑定

### 5. src/modules/sops/views/service/qa_maintenance/template.html
- 6个 onclick 事件
- 需要在 qa_maintenance/index.ts 中绑定

## 需要处理的 JavaScript 文件

### src/modules/amz_hub/views/practice/marketing_calendar/index.js
- 8个 onclick 事件
- 建议：将此文件迁移到 TypeScript 或手动修复

## 修复策略

对于 HTML 模板文件中的内联事件：

1. 在 HTML 中将 `onclick="functionName()"` 改为 `data-action="action-name"`
2. 在对应的 TypeScript 文件的 init() 或 render() 方法中：
   ```typescript
   const container = document.getElementById('container-id');
   container?.querySelectorAll('[data-action="action-name"]').forEach(btn => {
       btn.addEventListener('click', () => {
           // 处理逻辑
       });
   });
   ```

## 统计

- 总计中危漏洞：62个
- 已修复：9个文件中的约 15个
- 剩余：HTML模板文件 28个 + JS文件 8个 = 36个
- 进度：约 42% 完成
