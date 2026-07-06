# XSS风险扫描报告

**扫描时间**: 2026/7/6 15:51:05
**扫描目录**: `src/`
**扫描文件数**: 484
**命中文件数**: 0
**发现风险点**: 0
**已审计安全跳过**: 0
**清空DOM跳过**: 6

---

## 📊 风险统计

| 风险等级 | 数量 | 占比 |
|---------|------|------|
| 🔴 严重 (CRITICAL) | 0 | 0.0% |
| 🟠 高危 (HIGH) | 0 | 0.0% |
| 🟡 中危 (MEDIUM) | 0 | 0.0% |
| 🟢 低危 (LOW) | 0 | 0.0% |
| ⚪ 信息 (INFO) | 0 | 0.0% |

---

## 🎯 修复优先级

### 立即修复 (P0)
需要在发布前修复的严重和高危风险: **0** 处

### 计划修复 (P1)
建议在下个版本修复的中危风险: **0** 处

### 可选修复 (P2)
低风险和信息级别: **0** 处

---

## 📋 详细风险列表


## 🔧 修复指南

### 方法1: 使用 escapeHtml (推荐)

```javascript
import { escapeHtml } from '@/common/utils/security.js';

// ❌ 危险
element.innerHTML = `<div>${userInput}</div>`;

// ✅ 安全
element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
```

### 方法2: 使用 setTemplate

```javascript
import { setTemplate } from '@/common/utils/xssFixer.js';

// ❌ 危险
element.innerHTML = `<div class="title">${product.title}</div>`;

// ✅ 安全
setTemplate(element, '<div class="title">${title}</div>', { title: product.title });
```

### 方法3: 使用 renderList (列表渲染)

```javascript
import { renderList } from '@/common/utils/xssFixer.js';

// ❌ 危险
container.innerHTML = products.map(p => `<div>${p.title}</div>`).join('');

// ✅ 安全
renderList(container, products, (p) => `<div>${p.title}</div>`);
```

### 方法4: 纯文本使用 textContent

```javascript
// ❌ 危险
element.innerHTML = userInput;

// ✅ 安全
element.textContent = userInput;
```

---

## 📝 自动修复脚本

运行以下命令生成修复补丁:

```bash
node tools/security/xss-fixer.js --auto-fix
```

---

**报告生成**: XSS Scanner v1.0  
**下次扫描**: 修复后重新运行 `node tools/security/xss-scanner.js`
