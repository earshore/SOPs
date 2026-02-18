# XSS自动修复工具使用指南

## 🎯 工具概述

本工具集提供自动化的XSS风险扫描和修复功能,包括:

1. **xss-scanner.js** - XSS风险扫描工具
2. **xss-fixer.js** - XSS自动修复工具

---

## 📋 使用流程

### 步骤1: 扫描XSS风险

```bash
node tools/xss-scanner.js
```

**输出**:
- 控制台显示扫描统计
- 生成详细报告: `docs/XSS_SCAN_REPORT.md`

**报告内容**:
- 风险统计(严重/高危/中危/低危/信息)
- 按文件列出所有风险点
- 每个风险的详细信息(行号、代码、原因、建议)
- 修复示例代码

### 步骤2: 审查扫描报告

打开 `docs/XSS_SCAN_REPORT.md`,重点关注:

- 🔴 **严重风险** (CRITICAL) - 必须立即修复
- 🟠 **高危风险** (HIGH) - 优先修复
- 🟡 **中危风险** (MEDIUM) - 计划修复

### 步骤3: 试运行自动修复

```bash
node tools/xss-fixer.js --dry-run
```

**功能**:
- 模拟修复过程,不实际修改文件
- 显示将要进行的修复
- 生成补丁文件预览

### 步骤4: 应用自动修复

```bash
node tools/xss-fixer.js --auto-fix
```

**功能**:
- 自动修复可识别的风险模式
- 备份原文件到 `tools/backups/`
- 生成修复补丁到 `tools/patches/`
- 自动添加必要的import语句

### 步骤5: 手动修复剩余风险

对于无法自动修复的复杂情况,参考报告中的修复建议手动处理。

### 步骤6: 验证修复

```bash
# 重新扫描
node tools/xss-scanner.js

# 运行测试
npm test
```

---

## 🔧 修复策略

工具会根据代码模式自动选择修复策略:

### 策略1: 静态模板 (信任内容)

```javascript
// 检测到 loadTemplate 或 template.html
container.innerHTML = html; // ✅ 不修改,静态模板可信
```

### 策略2: 纯变量赋值 → textContent

```javascript
// 原代码
element.innerHTML = userInput;

// 自动修复为
element.textContent = userInput;
```

### 策略3: 模板字符串 → escapeHtml

```javascript
// 原代码
element.innerHTML = `<div>${title}</div>`;

// 自动修复为
import { escapeHtml } from '@/common/utils/security.js';
element.innerHTML = `<div>${escapeHtml(title)}</div>`;
```

### 策略4: 复杂情况 → setSafeHtml

```javascript
// 原代码
element.innerHTML = complexHtml;

// 自动修复为
import { setSafeHtml } from '@/common/utils/security.js';
setSafeHtml(element, complexHtml);
```

### 策略5: 无法自动修复

对于以下情况,工具会跳过并标记为需要手动处理:
- 字符串拼接 (`innerHTML = a + b + c`)
- 列表渲染 (`.map().join()`)
- 复杂的条件逻辑

---

## 📁 输出文件

### 扫描报告
- **位置**: `docs/XSS_SCAN_REPORT.md`
- **内容**: 完整的风险分析和修复建议

### 备份文件
- **位置**: `tools/backups/`
- **内容**: 修复前的原始文件
- **用途**: 如需回滚,从此目录恢复

### 补丁文件
- **位置**: `tools/patches/`
- **内容**: 每个文件的修复详情
- **格式**: Markdown,包含原代码和修复后代码对比

---

## ⚠️ 注意事项

### 1. 备份重要
修复前会自动备份,但建议先提交Git:
```bash
git add .
git commit -m "备份: XSS修复前"
```

### 2. 测试验证
修复后务必运行测试:
```bash
npm test
npm run dev  # 手动测试功能
```

### 3. 手动审查
自动修复可能不完美,建议:
- 审查所有修复的代码
- 特别关注业务逻辑复杂的部分
- 确认UI显示正常

### 4. 分批修复
如果风险点很多,建议分批修复:
```bash
# 只修复严重和高危
# 手动编辑 xss-fixer.js,添加风险等级过滤
```

---

## 🔍 故障排查

### 问题1: 扫描报告为空

**原因**: 可能没有找到风险或路径配置错误

**解决**:
```bash
# 检查配置
cat tools/xss-scanner.js | grep srcDir
```

### 问题2: 修复后代码报错

**原因**: 自动修复可能破坏了代码逻辑

**解决**:
```bash
# 从备份恢复
cp tools/backups/filename.js.bak src/path/to/filename.js

# 手动修复该文件
```

### 问题3: Import语句重复

**原因**: 文件已有相同的import

**解决**: 手动删除重复的import语句

---

## 📊 示例输出

### 扫描输出
```
🔍 开始扫描XSS风险...

📁 扫描目录: /path/to/src
📄 输出报告: /path/to/docs/XSS_SCAN_REPORT.md

✅ 扫描完成!

📊 统计结果:
   - 扫描文件: 45
   - 风险总数: 127
   - 🔴 严重: 12
   - 🟠 高危: 28
   - 🟡 中危: 45
   - 🟢 低危: 32
   - ⚪ 信息: 10

📄 详细报告: docs/XSS_SCAN_REPORT.md
```

### 修复输出
```
🔧 XSS自动修复工具

模式: 自动修复
试运行: 否

📋 发现 127 个风险点

📄 处理文件: src/modules/sops/views/email_templates/index.js
   风险数量: 5
   ✅ 第 74 行: 模板字符串 → escapeHtml转义
   ✅ 第 131 行: 纯变量赋值 → textContent
   ⚠️  第 233 行: 无法自动修复,需要手动处理
   💾 已保存修复

==================================================
📊 修复统计

处理文件: 38/45
修复风险: 95/127
跳过风险: 32

💾 备份目录: tools/backups
📄 补丁目录: tools/patches

✅ 修复已应用
   如需回滚,请从备份目录恢复文件
==================================================
```

---

## 🚀 快速开始

```bash
# 1. 扫描
node tools/xss-scanner.js

# 2. 查看报告
cat docs/XSS_SCAN_REPORT.md

# 3. 试运行修复
node tools/xss-fixer.js --dry-run

# 4. 应用修复
node tools/xss-fixer.js --auto-fix

# 5. 验证
npm test
```

---

## 📞 支持

如遇问题,请:
1. 查看 `docs/XSS_SCAN_REPORT.md` 详细报告
2. 检查 `tools/patches/` 补丁文件
3. 从 `tools/backups/` 恢复备份
4. 联系技术负责人

---

**工具版本**: v1.0  
**最后更新**: 2026-02-06
