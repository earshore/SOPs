# 手动测试指南

**测试目的**: 验证网页加载是否有错误打印
**开发服务器**: http://localhost:5174

---

## 🔍 手动测试步骤

### 1. 打开浏览器开发者工具

1. 打开 Chrome 或 Edge 浏览器
2. 访问 http://localhost:5174
3. 按 F12 打开开发者工具
4. 切换到 "Console" 标签

### 2. 检查控制台错误

**需要检查的内容**:

✅ **正常情况**:
- 无红色错误信息
- 可能有蓝色的 info 日志（正常）
- 可能有黄色的 warning（可接受）

❌ **需要关注的错误**:
- `Uncaught TypeError`
- `Uncaught ReferenceError`
- `Failed to fetch`
- `localStorage is not defined`
- `Maximum call stack size exceeded`（递归错误）

### 3. 测试关键功能

#### 3.1 主题切换测试
1. 点击右上角的主题切换按钮
2. 检查控制台是否有错误
3. 验证主题是否正常切换

**预期结果**: ✅ 无错误，主题正常切换

#### 3.2 页面导航测试
1. 点击左侧导航菜单
2. 切换不同的页面（首页、SOPs、Amazon Hub、应用中心、更多）
3. 检查控制台是否有错误

**预期结果**: ✅ 无错误，页面正常切换

#### 3.3 localStorage 功能测试
1. 打开开发者工具 → Application → Local Storage
2. 查看是否有数据存储
3. 刷新页面
4. 验证数据是否保持

**预期结果**: ✅ 数据正常存储和恢复

### 4. 检查网络请求

1. 切换到 "Network" 标签
2. 刷新页面
3. 检查是否有失败的请求（红色）

**预期结果**: ✅ 所有资源加载成功

---

## 📋 测试检查清单

### 控制台检查
- [ ] 无 `Uncaught` 错误
- [ ] 无 `localStorage` 相关错误
- [ ] 无递归调用错误
- [ ] 无模块加载错误

### 功能检查
- [ ] 页面正常加载
- [ ] 主题切换正常
- [ ] 导航切换正常
- [ ] localStorage 读写正常

### 性能检查
- [ ] 首屏加载时间 < 3 秒
- [ ] 无明显的性能警告
- [ ] 资源加载正常

---

## 🐛 常见问题排查

### 如果看到 localStorage 错误

**问题**: `localStorage is not defined` 或类似错误

**原因**: StorageService 未正确初始化

**解决**: 检查 `src/services/storageService.ts` 是否正确导入

### 如果看到递归调用错误

**问题**: `Maximum call stack size exceeded`

**原因**: Logger 服务递归调用

**解决**: 已在 commit `b0358bd` 中修复，确保代码是最新的

### 如果看到模块加载错误

**问题**: `Failed to load module`

**原因**: 模块路径错误或文件不存在

**解决**: 检查 Vite 开发服务器是否正常运行

---

## ✅ 预期的正常输出

控制台可能会看到以下正常日志：

```
[Vite] connected.
[HMR] Waiting for update signal from WS...
✓ [ViewLoader] Critical Views Ready (XXXms)
✓ 主题已切换: 蓝色 (X.XXms)
```

这些都是正常的调试信息，不是错误。

---

## 📊 测试报告模板

完成测试后，请记录：

```
测试日期: 2026-03-05
测试浏览器: Chrome/Edge
开发服务器: http://localhost:5174

控制台错误: [ ] 无错误 / [ ] 有错误（请描述）
功能测试: [ ] 通过 / [ ] 失败（请描述）
性能测试: [ ] 正常 / [ ] 异常（请描述）

备注:
（记录任何异常情况）
```

---

## 🚀 自动化测试（可选）

如果 Playwright 环境配置好后，可以运行：

```bash
# 基础加载测试
npm run test:e2e

# 性能测试
npm run test:performance

# 完整测试套件
npm run test:e2e:parallel
```

---

**测试负责人**: 开发团队
**最后更新**: 2026-03-05
