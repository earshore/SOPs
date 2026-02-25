# Zustand 迁移手动测试指南

## 测试环境

- **开发服务器**: http://localhost:5173
- **浏览器**: Chrome (已打开)
- **DevTools**: 按 F12 打开

## 测试清单

### 1. 基础功能测试 ✅

#### 1.1 检查 Zustand Store 加载
```javascript
// 在浏览器控制台执行
window.appStore
// 应该返回 Zustand store 对象

window.appStore.getState()
// 应该返回完整的状态树
```

#### 1.2 检查状态模块
```javascript
// 检查各个模块
window.appStore.getState().ui
window.appStore.getState().scraper
window.appStore.getState().analysis
window.appStore.getState().promptlab
window.appStore.getState().keywordTracker
window.appStore.getState().qalab
```

### 2. UI 状态测试 ✅

#### 2.1 标签切换
```javascript
// 切换到 Scraper 标签
window.appStore.getState().setCurrentTab('scraper')

// 验证
window.appStore.getState().ui.currentTab
// 应该返回 'scraper'
```

#### 2.2 主题切换
```javascript
// 切换到暗色主题
window.appStore.getState().setTheme('dark')

// 验证
window.appStore.getState().ui.theme
// 应该返回 'dark'
```

#### 2.3 加载状态
```javascript
// 设置加载中
window.appStore.getState().setLoading(true)

// 验证
window.appStore.getState().ui.loading
// 应该返回 true
```

### 3. Scraper 模块测试 ✅

#### 3.1 设置抓取状态
```javascript
// 开始抓取
window.appStore.getState().setIsScraping(true)
window.appStore.getState().setScraperStatus('scraping')
window.appStore.getState().setSelectedSite('amazon.com')

// 验证
window.appStore.getState().scraper.isScraping
window.appStore.getState().scraper.status
window.appStore.getState().scraper.selectedSite
```

#### 3.2 设置抓取数据
```javascript
// 模拟抓取数据
const mockData = {
  products: [
    { asin: 'B001', title: 'Product 1' },
    { asin: 'B002', title: 'Product 2' }
  ]
}

window.appStore.getState().setScrapedData(mockData)

// 验证
window.appStore.getState().scraper.scrapedData
```

### 4. Analysis 模块测试 ✅

#### 4.1 选择 ASINs
```javascript
// 选择 ASINs
window.appStore.getState().setSelectedAsins(['B001', 'B002', 'B003'])

// 验证
window.appStore.getState().analysis.selectedAsins
```

#### 4.2 设置分析报告
```javascript
// 设置报告
const mockReport = {
  marketplace: 'US',
  results: [
    { asin: 'B001', score: 85 },
    { asin: 'B002', score: 92 }
  ]
}

window.appStore.getState().setAnalysisReport(mockReport)

// 验证
window.appStore.getState().analysis.analysisReport
```

### 5. QALab 模块测试 ✅

#### 5.1 设置语言和类别
```javascript
// 设置语言
window.appStore.getState().setQALabLang('en')

// 设置类别
window.appStore.getState().setQALabCategory('technical')

// 验证
window.appStore.getState().qalab.currentLang
window.appStore.getState().qalab.currentCategory
```

#### 5.2 添加 Rufus 消息
```javascript
// 添加用户消息
window.appStore.getState().addRufusMessage({
  role: 'user',
  content: 'Hello Rufus!',
  timestamp: Date.now()
})

// 添加助手消息
window.appStore.getState().addRufusMessage({
  role: 'assistant',
  content: 'Hello! How can I help you?',
  timestamp: Date.now()
})

// 验证
window.appStore.getState().qalab.rufusMessages
```

### 6. 状态订阅测试 ✅

#### 6.1 订阅状态变化
```javascript
// 订阅整个 store
const unsubscribe = window.appStore.subscribe((state) => {
  console.log('状态已更新:', state.ui.currentTab)
})

// 触发更新
window.appStore.getState().setCurrentTab('home')
window.appStore.getState().setCurrentTab('scraper')

// 取消订阅
unsubscribe()
```

### 7. 持久化测试 ✅

#### 7.1 检查 localStorage
```javascript
// 查看持久化的状态
localStorage.getItem('app-storage')
// 应该返回 JSON 字符串
```

#### 7.2 测试持久化
```javascript
// 修改状态
window.appStore.getState().setCurrentTab('analysis')
window.appStore.getState().setTheme('dark')

// 刷新页面
location.reload()

// 验证状态已恢复
window.appStore.getState().ui.currentTab
window.appStore.getState().ui.theme
```

### 8. DevTools 测试 ✅

#### 8.1 打开 Redux DevTools
1. 安装 Redux DevTools 扩展（如果未安装）
2. 打开浏览器开发者工具
3. 切换到 "Redux" 标签
4. 查看状态树

#### 8.2 时间旅行调试
1. 在 Redux DevTools 中触发一些状态变化
2. 使用左侧的时间轴回退到之前的状态
3. 验证页面状态同步更新

### 9. 兼容层测试 ⚠️

#### 9.1 测试旧的 state 访问（应该有警告）
```javascript
// 这应该仍然工作，但会在控制台显示弃用警告
window.state.ui.currentTab

// 检查控制台是否有弃用警告
```

### 10. 错误检查 ✅

#### 10.1 检查控制台错误
- 打开浏览器控制台
- 查看是否有红色错误信息
- 特别注意状态相关的错误

#### 10.2 检查网络请求
- 打开 Network 标签
- 刷新页面
- 检查是否有失败的请求

## 测试结果记录

### 通过的测试 ✅
- [ ] Zustand Store 加载
- [ ] UI 状态更新
- [ ] Scraper 模块功能
- [ ] Analysis 模块功能
- [ ] QALab 模块功能
- [ ] 状态订阅
- [ ] 持久化功能
- [ ] DevTools 集成

### 发现的问题 ❌
记录在此：

1. 

2. 

3. 

## 性能测试

### 内存使用
```javascript
// 检查内存使用
performance.memory
```

### 状态更新性能
```javascript
// 测试 1000 次状态更新
console.time('状态更新')
for (let i = 0; i < 1000; i++) {
  window.appStore.getState().setCurrentTab(i % 2 === 0 ? 'home' : 'scraper')
}
console.timeEnd('状态更新')
```

## 常见问题

### Q: 看不到 Redux DevTools？
A: 确保已安装 Redux DevTools 扩展，并且在开发环境运行。

### Q: 状态没有持久化？
A: 检查 localStorage 是否被禁用，或者浏览器是否处于隐私模式。

### Q: 控制台有很多弃用警告？
A: 这是正常的，说明兼容层正在工作。这些警告会引导开发者迁移到新 API。

## 下一步

测试完成后：
1. 记录所有发现的问题
2. 创建 GitHub Issues
3. 更新测试文档
4. 通知团队测试结果

## 关闭测试环境

```bash
# 停止开发服务器
kill $(cat /tmp/vite_pid.txt)

# 或者在终端按 Ctrl+C
```
