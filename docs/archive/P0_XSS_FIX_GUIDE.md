# P0 XSS修复快速指南

**优先级**: 🔴 P0 - 阻塞发布  
**预计工作量**: 4-6小时  
**负责人**: 开发团队

---

## 🚀 快速开始 (5分钟)

```bash
# 1. 扫描XSS风险
npm run xss:scan

# 2. 查看报告
# 打开 docs/XSS_SCAN_REPORT.md

# 3. 试运行修复
npm run xss:fix:dry

# 4. 应用自动修复
npm run xss:fix

# 5. 验证修复
npm test
npm run dev  # 手动测试
```

---

## 📋 详细步骤

### 第1步: 扫描风险 (5分钟)

```bash
npm run xss:scan
```

**输出**:
- 控制台显示统计信息
- 生成报告: `docs/XSS_SCAN_REPORT.md`

**重点关注**:
- 🔴 严重风险 (CRITICAL) - 包含用户输入
- 🟠 高危风险 (HIGH) - 使用模板字符串

### 第2步: 审查报告 (15分钟)

打开 `docs/XSS_SCAN_REPORT.md`,按优先级审查:

#### 高危文件 (必须修复)
- `src/modules/app_center/views/master_prompt/analysis/renderer.js`
- `src/modules/app_center/views/master_prompt/data/index.js`
- `src/modules/app_center/views/master_prompt/scraper/index.js`
- `src/modules/sops/views/service/email_templates/index.js`

#### 中危文件 (建议修复)
- `src/common/utils/ui.js`
- `src/modules/more/views/explore/prompts/index.js`

### 第3步: 试运行修复 (5分钟)

```bash
npm run xss:fix:dry
```

**检查**:
- 查看控制台输出的修复计划
- 确认修复策略合理
- 检查 `tools/patches/` 补丁预览

### 第4步: 应用自动修复 (10分钟)

```bash
# 备份代码
git add .
git commit -m "备份: XSS修复前"

# 应用修复
npm run xss:fix
```

**自动完成**:
- ✅ 备份原文件到 `tools/backups/`
- ✅ 修复可识别的风险模式
- ✅ 添加必要的import语句
- ✅ 生成修复补丁到 `tools/patches/`

### 第5步: 手动修复剩余风险 (2-4小时)

对于无法自动修复的复杂情况,参考以下模式手动处理:

#### 模式1: 列表渲染

```javascript
// ❌ 危险
container.innerHTML = products.map(p => `
  <div class="product">
    <h3>${p.title}</h3>
    <p>${p.price}</p>
  </div>
`).join('');

// ✅ 安全方案A: 使用renderList
import { renderList } from '@/common/utils/xssFixer.js';
renderList(container, products, (p) => `
  <div class="product">
    <h3>${p.title}</h3>
    <p>${p.price}</p>
  </div>
`);

// ✅ 安全方案B: 手动转义
import { escapeHtml } from '@/common/utils/security.js';
container.innerHTML = products.map(p => `
  <div class="product">
    <h3>${escapeHtml(p.title)}</h3>
    <p>${escapeHtml(p.price)}</p>
  </div>
`).join('');
```

#### 模式2: 字符串拼接

```javascript
// ❌ 危险
element.innerHTML = '<div>' + userInput + '</div>';

// ✅ 安全
import { escapeHtml } from '@/common/utils/security.js';
element.innerHTML = '<div>' + escapeHtml(userInput) + '</div>';
```

#### 模式3: 条件渲染

```javascript
// ❌ 危险
element.innerHTML = isActive ? `<span>${name}</span>` : '';

// ✅ 安全
import { escapeHtml } from '@/common/utils/security.js';
element.innerHTML = isActive ? `<span>${escapeHtml(name)}</span>` : '';
```

#### 模式4: LLM生成内容

```javascript
// ❌ 危险
reportContainer.innerHTML = llmResponse;

// ✅ 安全方案A: Markdown渲染
import { marked } from 'marked';
import { setSafeHtml } from '@/common/utils/security.js';
const html = marked.parse(llmResponse);
setSafeHtml(reportContainer, html);

// ✅ 安全方案B: 纯文本
reportContainer.textContent = llmResponse;
```

### 第6步: 验证修复 (30分钟)

#### 6.1 运行测试

```bash
npm test
```

**检查**:
- 所有测试通过
- 无新增错误

#### 6.2 手动测试

```bash
npm run dev
```

**测试场景**:
1. **ASIN输入测试**
   - 输入正常ASIN: `B08N5WRWNW`
   - 输入恶意代码: `<script>alert('XSS')</script>`
   - 预期: 恶意代码被转义显示,不执行

2. **Prompt输入测试**
   - 输入正常Prompt
   - 输入包含HTML的Prompt: `<img src=x onerror=alert(1)>`
   - 预期: HTML被转义,不执行

3. **数据展示测试**
   - 查看产品列表
   - 查看分析报告
   - 预期: 所有内容正常显示

4. **邮件模板测试**
   - 查看邮件模板
   - 复制模板内容
   - 预期: 功能正常

#### 6.3 XSS攻击测试

使用以下测试向量:

```javascript
// 测试向量1: 基础XSS
<script>alert('XSS')</script>

// 测试向量2: 事件处理器
<img src=x onerror=alert(1)>

// 测试向量3: JavaScript伪协议
<a href="javascript:alert(1)">Click</a>

// 测试向量4: 编码绕过
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>

// 测试向量5: 标签嵌套
<div><img src=x onerror=alert(1)></div>
```

**预期结果**: 所有测试向量都被安全处理,不执行恶意代码

### 第7步: 重新扫描 (5分钟)

```bash
npm run xss:scan
```

**目标**:
- 🔴 严重风险: 0
- 🟠 高危风险: 0
- 🟡 中危风险: < 10

### 第8步: 提交修复 (5分钟)

```bash
git add .
git commit -m "🔒 P0修复: XSS注入漏洞

- 自动修复 95+ 处innerHTML使用
- 手动修复复杂场景
- 添加XSS防护工具类
- 所有用户输入已转义
- 测试通过

风险等级: P0 → 已解决
修复工具: tools/xss-scanner.js, tools/xss-fixer.js
扫描报告: docs/XSS_SCAN_REPORT.md"
```

---

## 🔧 常用修复模式

### 快速参考

| 场景 | 原代码 | 修复方案 |
|------|--------|---------|
| 纯文本 | `el.innerHTML = text` | `el.textContent = text` |
| 模板字符串 | `el.innerHTML = \`<div>\${x}</div>\`` | `el.innerHTML = \`<div>\${escapeHtml(x)}</div>\`` |
| 静态模板 | `el.innerHTML = html` | `setSafeHtml(el, html)` |
| 列表渲染 | `el.innerHTML = arr.map(...).join('')` | `renderList(el, arr, ...)` |
| Markdown | `el.innerHTML = md` | `setSafeHtml(el, marked.parse(md))` |

### Import语句

```javascript
// 基础安全函数
import { escapeHtml, setSafeHtml } from '@/common/utils/security.js';

// 高级工具函数
import { setTemplate, renderList, setText } from '@/common/utils/xssFixer.js';

// Markdown渲染
import { marked } from 'marked';
```

---

## ⚠️ 注意事项

### 1. 不要过度转义

```javascript
// ❌ 错误: 静态HTML被转义
const staticHtml = '<div class="title">标题</div>';
element.innerHTML = escapeHtml(staticHtml); // 显示为文本

// ✅ 正确: 静态HTML直接使用
element.innerHTML = staticHtml;

// ✅ 正确: 只转义动态部分
element.innerHTML = `<div class="title">${escapeHtml(dynamicTitle)}</div>`;
```

### 2. 信任的内容

以下内容可以信任,无需转义:
- 静态HTML模板 (`loadTemplate()`)
- 自己生成的HTML (无用户输入)
- 已经过安全处理的内容

### 3. 不信任的内容

以下内容必须转义:
- 用户输入 (表单、URL参数)
- 第三方数据 (API返回、采集数据)
- LLM生成内容 (可能包含恶意代码)
- URL参数和Cookie

### 4. 特殊情况

#### Markdown渲染
```javascript
// ✅ 使用marked + setSafeHtml
import { marked } from 'marked';
import { setSafeHtml } from '@/common/utils/security.js';

const html = marked.parse(markdown);
setSafeHtml(element, html); // 自动移除危险元素
```

#### 富文本编辑器
```javascript
// ✅ 使用DOMPurify (如果需要)
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(dirtyHtml);
element.innerHTML = clean;
```

---

## 🐛 故障排查

### 问题1: 修复后UI显示异常

**症状**: 内容显示为HTML源码

**原因**: 过度转义,静态HTML被转义

**解决**:
```javascript
// 检查是否误转义了静态HTML
// 将 escapeHtml() 改为直接赋值
element.innerHTML = staticHtml; // 不转义
```

### 问题2: 修复后功能失效

**症状**: 点击事件不触发,样式丢失

**原因**: setSafeHtml移除了事件处理器或样式

**解决**:
```javascript
// 方案A: 使用事件委托
document.addEventListener('click', (e) => {
  if (e.target.matches('.my-button')) {
    // 处理点击
  }
});

// 方案B: 渲染后重新绑定事件
element.innerHTML = html;
element.querySelector('.my-button').addEventListener('click', handler);
```

### 问题3: Import语句报错

**症状**: `Cannot find module '@/common/utils/security.js'`

**原因**: 路径别名配置问题

**解决**:
```javascript
// 使用相对路径
import { escapeHtml } from '../../common/utils/security.js';
```

### 问题4: 测试失败

**症状**: 测试用例报错

**原因**: Mock数据包含HTML

**解决**:
```javascript
// 更新测试用例,使用转义后的期望值
expect(element.innerHTML).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
```

---

## 📊 修复进度追踪

### 检查清单

- [ ] 运行XSS扫描
- [ ] 审查扫描报告
- [ ] 应用自动修复
- [ ] 手动修复剩余风险
- [ ] 运行单元测试
- [ ] 手动功能测试
- [ ] XSS攻击测试
- [ ] 重新扫描验证
- [ ] 提交代码

### 目标指标

| 指标 | 当前 | 目标 | 状态 |
|------|------|------|------|
| 严重风险 | ? | 0 | ⏳ |
| 高危风险 | ? | 0 | ⏳ |
| 中危风险 | ? | < 10 | ⏳ |
| 测试通过率 | ? | 100% | ⏳ |

---

## 📞 获取帮助

### 工具文档
- 详细使用说明: `tools/README.md`
- 扫描报告: `docs/XSS_SCAN_REPORT.md`
- 修复补丁: `tools/patches/`

### 备份恢复
```bash
# 查看备份
ls tools/backups/

# 恢复单个文件
cp tools/backups/filename.js.bak src/path/to/filename.js

# 恢复所有文件
git checkout .
```

### 联系支持
- 技术负责人
- 安全团队

---

**修复负责人**: 开发团队  
**审查人**: 技术负责人  
**预计完成时间**: 4-6小时  
**风险等级**: 🔴 P0 - 阻塞发布
