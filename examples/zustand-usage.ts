// examples/zustand-usage.ts
// ================================================================
// Zustand 状态管理使用示例
// ================================================================

import { appStore, selectors } from '../src/stores/useAppStore';

// ==================== 示例 1: 基本读写 ====================

function example1_BasicReadWrite() {
  console.log('=== 示例 1: 基本读写 ===');
  
  // 读取状态
  const currentTab = appStore.getState().ui.currentTab;
  console.log('当前标签:', currentTab);
  
  // 更新状态
  appStore.getState().setCurrentTab('scraper');
  console.log('更新后:', appStore.getState().ui.currentTab);
  
  // 批量更新
  appStore.getState().updateUI({
    currentTab: 'analysis',
    loading: true,
    theme: 'dark'
  });
}

// ==================== 示例 2: 使用 Selectors ====================

function example2_UseSelectors() {
  console.log('=== 示例 2: 使用 Selectors ===');
  
  // 使用 selector 读取状态（推荐）
  const state = appStore.getState();
  const currentTab = selectors.currentTab(state);
  const isScraping = selectors.isScraping(state);
  
  console.log('当前标签:', currentTab);
  console.log('是否正在抓取:', isScraping);
}

// ==================== 示例 3: 订阅状态变化 ====================

function example3_Subscribe() {
  console.log('=== 示例 3: 订阅状态变化 ===');
  
  // 订阅整个 store
  const unsubscribe = appStore.subscribe((state) => {
    console.log('状态已更新:', state.ui.currentTab);
  });
  
  // 触发更新
  appStore.getState().setCurrentTab('home');
  
  // 取消订阅
  unsubscribe();
}

// ==================== 示例 4: 订阅特定状态 ====================

function example4_SubscribeSpecific() {
  console.log('=== 示例 4: 订阅特定状态 ===');
  
  let previousTab = appStore.getState().ui.currentTab;
  
  const unsubscribe = appStore.subscribe((state) => {
    const currentTab = state.ui.currentTab;
    if (currentTab !== previousTab) {
      console.log('标签变化:', previousTab, '->', currentTab);
      previousTab = currentTab;
    }
  });
  
  // 触发更新
  appStore.getState().setCurrentTab('scraper');
  appStore.getState().setCurrentTab('analysis');
  
  unsubscribe();
}

// ==================== 示例 5: Scraper 状态管理 ====================

function example5_ScraperState() {
  console.log('=== 示例 5: Scraper 状态管理 ===');
  
  // 开始抓取
  appStore.getState().setIsScraping(true);
  appStore.getState().setScraperStatus('scraping');
  appStore.getState().setSelectedSite('amazon.com');
  
  // 模拟抓取完成
  setTimeout(() => {
    const mockData = {
      products: [
        { asin: 'B001', title: 'Product 1' },
        { asin: 'B002', title: 'Product 2' }
      ]
    };
    
    appStore.getState().setScrapedData(mockData);
    appStore.getState().setIsScraping(false);
    appStore.getState().setScraperStatus('success');
    
    console.log('抓取完成:', appStore.getState().scraper.scrapedData);
  }, 1000);
}

// ==================== 示例 6: Analysis 状态管理 ====================

function example6_AnalysisState() {
  console.log('=== 示例 6: Analysis 状态管理 ===');
  
  // 选择 ASINs
  appStore.getState().setSelectedAsins(['B001', 'B002', 'B003']);
  
  // 设置分析报告
  const mockReport = {
    marketplace: 'US',
    results: [
      { asin: 'B001', score: 85 },
      { asin: 'B002', score: 92 }
    ]
  };
  
  appStore.getState().setAnalysisReport(mockReport);
  
  // 读取状态
  const report = appStore.getState().analysis.analysisReport;
  console.log('分析报告:', report);
}

// ==================== 示例 7: 重置模块状态 ====================

function example7_ResetState() {
  console.log('=== 示例 7: 重置模块状态 ===');
  
  // 修改状态
  appStore.getState().setIsScraping(true);
  appStore.getState().setSelectedSite('amazon.com');
  console.log('修改后:', appStore.getState().scraper);
  
  // 重置 scraper 模块
  appStore.getState().resetScraper();
  console.log('重置后:', appStore.getState().scraper);
}

// ==================== 示例 8: QALab 状态管理 ====================

function example8_QALabState() {
  console.log('=== 示例 8: QALab 状态管理 ===');
  
  // 设置语言和类别
  appStore.getState().setQALabLang('en');
  appStore.getState().setQALabCategory('technical');
  
  // 添加 Rufus 消息
  appStore.getState().addRufusMessage({
    role: 'user',
    content: 'Hello Rufus!',
    timestamp: Date.now()
  });
  
  appStore.getState().addRufusMessage({
    role: 'assistant',
    content: 'Hello! How can I help you?',
    timestamp: Date.now()
  });
  
  // 读取状态
  const messages = appStore.getState().qalab.rufusMessages;
  console.log('Rufus 消息:', messages);
}

// ==================== 示例 9: 持久化状态 ====================

function example9_Persistence() {
  console.log('=== 示例 9: 持久化状态 ===');
  
  // Zustand 的 persist 中间件会自动保存以下状态到 localStorage:
  // - ui.currentTab
  // - ui.currentDataTab
  // - ui.currentReportTab
  // - ui.theme
  // - ui.sidebarCollapsed
  // - scraper.selectedSite
  // - scraper.scrapedData
  
  // 修改会自动持久化的状态
  appStore.getState().setCurrentTab('analysis');
  appStore.getState().setTheme('dark');
  
  console.log('状态已自动保存到 localStorage (key: app-storage)');
  
  // 刷新页面后，状态会自动恢复
}

// ==================== 示例 10: DevTools 集成 ====================

function example10_DevTools() {
  console.log('=== 示例 10: DevTools 集成 ===');
  
  // 在开发环境中，Zustand DevTools 会自动启用
  // 可以在浏览器的 Redux DevTools 扩展中查看状态变化
  
  console.log('打开 Redux DevTools 查看状态树和时间旅行功能');
  
  // 触发一些状态变化
  appStore.getState().setCurrentTab('home');
  appStore.getState().setCurrentTab('scraper');
  appStore.getState().setCurrentTab('analysis');
  
  console.log('在 DevTools 中可以看到这些状态变化');
}

// ==================== 运行所有示例 ====================

export function runAllExamples() {
  example1_BasicReadWrite();
  example2_UseSelectors();
  example3_Subscribe();
  example4_SubscribeSpecific();
  example5_ScraperState();
  example6_AnalysisState();
  example7_ResetState();
  example8_QALabState();
  example9_Persistence();
  example10_DevTools();
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
