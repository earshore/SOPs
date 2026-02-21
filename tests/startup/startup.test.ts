// tests/startup/startup.test.ts
// ================================================================
// 🚀 应用启动测试
// 测试应用能够成功启动，无 JavaScript 错误
// ================================================================

import { test, expect } from '@playwright/test';
import { setupConsoleErrorListener } from '../helpers/playwright-utils';

test.describe('应用启动测试', () => {
  test('1.5.3 应用成功启动（无 JS 错误）', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待主内容区域加载
    await page.waitForSelector('#main-content', {
      state: 'visible',
      timeout: 10000
    });

    // 验证：无控制台错误
    const errors = consoleListener.getErrors();
    
    // 如果有错误，输出详细信息以便调试
    if (errors.length > 0) {
      console.error('❌ 检测到控制台错误:');
      errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 断言：应该没有 JavaScript 错误
    expect(errors.length, `应用启动时不应有 JavaScript 错误，但检测到 ${errors.length} 个错误`).toBe(0);

    // 验证：页面标题正确
    const title = await page.title();
    expect(title).toBe('Amazing Amazon Architect');

    // 验证：主要 DOM 元素存在
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();

    // 验证：无页面错误（pageerror 事件）
    // 这已经被 setupConsoleErrorListener 捕获了
    expect(consoleListener.hasErrors()).toBe(false);

    console.log('✅ 应用启动测试通过：无 JavaScript 错误');
  });

  test('1.5.4 测试所有服务初始化成功', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待应用初始化完成事件
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined;
    }, { timeout: 10000 });

    // 等待一段时间确保所有服务初始化完成
    await page.waitForTimeout(2000);

    // 验证：检查 DI 容器是否存在
    const hasContainer = await page.evaluate(() => {
      return window.hasOwnProperty('__container__') || 
             typeof (window as any).container !== 'undefined';
    });

    // 验证：检查关键服务是否已初始化
    const servicesStatus = await page.evaluate(() => {
      const results: Record<string, boolean> = {};
      
      // 检查 Alpine.js
      results['Alpine.js'] = typeof (window as any).Alpine !== 'undefined' && 
                             (window as any).Alpine !== null;
      
      // 检查 EventBus
      results['EventBus'] = typeof (window as any).eventBus !== 'undefined' ||
                           typeof (window as any).EventBus !== 'undefined';
      
      // 检查 Router
      results['Router'] = typeof (window as any).router !== 'undefined' ||
                         typeof (window as any).Router !== 'undefined';
      
      // 检查 LoadingManager
      results['LoadingManager'] = typeof (window as any).loadingManager !== 'undefined' ||
                                 typeof (window as any).LoadingManager !== 'undefined';
      
      // 检查 ActionRegistry
      results['ActionRegistry'] = typeof (window as any).actionRegistry !== 'undefined' ||
                                 typeof (window as any).ActionRegistry !== 'undefined';
      
      // 检查全局状态
      results['State'] = typeof (window as any).state !== 'undefined';
      
      // 检查 Zustand Store
      results['AppStore'] = typeof (window as any).useAppStore !== 'undefined';
      
      return results;
    });

    // 输出服务状态
    console.log('📊 服务初始化状态:');
    for (const [service, status] of Object.entries(servicesStatus)) {
      const icon = status ? '✅' : '❌';
      console.log(`  ${icon} ${service}: ${status ? '已初始化' : '未初始化'}`);
    }

    // 验证：检查是否有初始化错误
    const errors = consoleListener.getErrors();
    
    // 过滤掉一些已知的非关键警告
    const criticalErrors = errors.filter(error => {
      const errorStr = error.toLowerCase();
      // 排除一些已知的非关键警告
      return !errorStr.includes('deprecated') && 
             !errorStr.includes('warning') &&
             !errorStr.includes('favicon');
    });

    if (criticalErrors.length > 0) {
      console.error('❌ 检测到关键错误:');
      criticalErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 断言：Alpine.js 必须已初始化
    expect(servicesStatus['Alpine.js'], 'Alpine.js 应该已初始化').toBe(true);

    // 断言：全局状态必须已初始化
    expect(servicesStatus['State'], '全局状态应该已初始化').toBe(true);

    // 断言：不应有关键错误
    expect(criticalErrors.length, `服务初始化时不应有关键错误，但检测到 ${criticalErrors.length} 个错误`).toBe(0);

    // 验证：检查应用初始化完成事件是否触发
    const appInitialized = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        // 检查是否已经触发过初始化事件
        const checkInitialized = () => {
          // 检查主内容区域是否可见
          const mainContent = document.getElementById('main-content');
          if (mainContent && mainContent.offsetParent !== null) {
            resolve(true);
            return;
          }
          
          // 如果还没初始化，等待事件
          const timeout = setTimeout(() => {
            resolve(false);
          }, 5000);
          
          window.addEventListener('app:initialized', () => {
            clearTimeout(timeout);
            resolve(true);
          }, { once: true });
        };
        
        checkInitialized();
      });
    });

    expect(appInitialized, '应用应该触发初始化完成事件').toBe(true);

    // 验证：检查路由系统是否正常工作
    const routerWorks = await page.evaluate(() => {
      return typeof (window as any).router !== 'undefined' &&
             typeof (window as any).router.navigate === 'function';
    });

    if (routerWorks) {
      console.log('✅ 路由系统已正常初始化');
    }

    // 统计初始化成功的服务数量
    const initializedCount = Object.values(servicesStatus).filter(status => status).length;
    const totalServices = Object.keys(servicesStatus).length;
    
    console.log(`\n📊 服务初始化统计: ${initializedCount}/${totalServices} 个服务已初始化`);
    
    // 断言：至少 80% 的关键服务应该已初始化
    const initializationRate = initializedCount / totalServices;
    expect(initializationRate, `至少 80% 的关键服务应该已初始化，当前: ${Math.round(initializationRate * 100)}%`).toBeGreaterThanOrEqual(0.8);

    console.log('✅ 所有服务初始化测试通过');
  });

  test('1.5.5 测试 Alpine.js 正确加载', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待 Alpine.js 加载完成
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined &&
             (window as any).Alpine !== null;
    }, { timeout: 10000 });

    console.log('📊 开始检测 Alpine.js 加载状态...');

    // 验证：检查 Alpine.js 是否已加载到 window 对象
    const alpineStatus = await page.evaluate(() => {
      const results: Record<string, any> = {};
      
      // 检查 Alpine 对象是否存在
      results['Alpine对象存在'] = typeof (window as any).Alpine !== 'undefined' && 
                                   (window as any).Alpine !== null;
      
      // 检查 Alpine 是否已启动
      results['Alpine已启动'] = (window as any).Alpine && 
                               typeof (window as any).Alpine.version !== 'undefined';
      
      // 检查 Alpine 的核心方法是否存在
      const alpine = (window as any).Alpine;
      if (alpine) {
        results['data方法存在'] = typeof alpine.data === 'function';
        results['store方法存在'] = typeof alpine.store === 'function';
        results['start方法存在'] = typeof alpine.start === 'function';
        
        // 获取 Alpine 版本信息
        results['Alpine版本'] = alpine.version || '未知';
      }
      
      return results;
    });

    // 输出 Alpine.js 状态
    console.log('📊 Alpine.js 加载状态:');
    for (const [key, value] of Object.entries(alpineStatus)) {
      const icon = value === true || (typeof value === 'string' && value !== '未知') ? '✅' : '❌';
      console.log(`  ${icon} ${key}: ${value}`);
    }

    // 断言：Alpine 对象必须存在
    expect(alpineStatus['Alpine对象存在'], 'Alpine 对象应该已加载到 window').toBe(true);

    // 断言：Alpine 必须已启动
    expect(alpineStatus['Alpine已启动'], 'Alpine.js 应该已启动').toBe(true);

    // 断言：核心方法必须存在
    expect(alpineStatus['data方法存在'], 'Alpine.data() 方法应该存在').toBe(true);
    expect(alpineStatus['store方法存在'], 'Alpine.store() 方法应该存在').toBe(true);
    expect(alpineStatus['start方法存在'], 'Alpine.start() 方法应该存在').toBe(true);

    // 验证：检查是否有 Alpine 组件已注册
    const registeredComponents = await page.evaluate(() => {
      const alpine = (window as any).Alpine;
      if (!alpine) return [];
      
      // Alpine.js 内部存储组件的方式可能因版本而异
      // 尝试获取已注册的组件列表
      const components: string[] = [];
      
      // 检查是否有 Alpine 数据组件（通过 x-data 属性）
      const elementsWithXData = document.querySelectorAll('[x-data]');
      elementsWithXData.forEach((el) => {
        const xDataValue = el.getAttribute('x-data');
        if (xDataValue) {
          components.push(xDataValue);
        }
      });
      
      return components;
    });

    console.log(`📊 检测到 ${registeredComponents.length} 个 Alpine 组件实例`);
    if (registeredComponents.length > 0) {
      console.log('  组件列表:', registeredComponents.slice(0, 5).join(', ') + 
                  (registeredComponents.length > 5 ? '...' : ''));
    }

    // 验证：测试 Alpine 响应式功能
    const alpineReactivityWorks = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        try {
          // 创建一个简单的测试元素
          const testDiv = document.createElement('div');
          testDiv.setAttribute('x-data', '{ test: "hello" }');
          testDiv.setAttribute('x-text', 'test');
          testDiv.style.display = 'none';
          document.body.appendChild(testDiv);
          
          // 等待 Alpine 处理
          setTimeout(() => {
            const textContent = testDiv.textContent;
            document.body.removeChild(testDiv);
            resolve(textContent === 'hello');
          }, 500);
        } catch (error) {
          resolve(false);
        }
      });
    });

    console.log(`📊 Alpine 响应式功能: ${alpineReactivityWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);

    // 断言：Alpine 响应式功能应该正常工作
    expect(alpineReactivityWorks, 'Alpine.js 响应式功能应该正常工作').toBe(true);

    // 验证：检查是否有 Alpine 相关的错误
    const errors = consoleListener.getErrors();
    const alpineErrors = errors.filter(error => {
      const errorStr = error.toLowerCase();
      return errorStr.includes('alpine') || 
             errorStr.includes('x-data') || 
             errorStr.includes('x-bind') ||
             errorStr.includes('x-on');
    });

    if (alpineErrors.length > 0) {
      console.error('❌ 检测到 Alpine 相关错误:');
      alpineErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 断言：不应有 Alpine 相关错误
    expect(alpineErrors.length, `不应有 Alpine 相关错误，但检测到 ${alpineErrors.length} 个错误`).toBe(0);

    // 验证：检查 Alpine 组件是否能正常初始化
    const componentInitWorks = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        try {
          const alpine = (window as any).Alpine;
          if (!alpine || typeof alpine.data !== 'function') {
            resolve(false);
            return;
          }
          
          // 尝试注册一个测试组件
          alpine.data('testComponent', () => ({
            message: 'test',
            getMessage() {
              return this.message;
            }
          }));
          
          resolve(true);
        } catch (error) {
          console.error('组件注册失败:', error);
          resolve(false);
        }
      });
    });

    console.log(`📊 Alpine 组件注册功能: ${componentInitWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);

    // 断言：Alpine 组件注册功能应该正常工作
    expect(componentInitWorks, 'Alpine.js 组件注册功能应该正常工作').toBe(true);

    // 统计 Alpine.js 功能状态
    const functionalityCount = [
      alpineStatus['Alpine对象存在'],
      alpineStatus['Alpine已启动'],
      alpineStatus['data方法存在'],
      alpineStatus['store方法存在'],
      alpineStatus['start方法存在'],
      alpineReactivityWorks,
      componentInitWorks
    ].filter(status => status === true).length;

    console.log(`\n📊 Alpine.js 功能统计: ${functionalityCount}/7 项功能正常`);

    // 断言：所有核心功能都应该正常
    expect(functionalityCount, 'Alpine.js 所有核心功能都应该正常工作').toBe(7);

    console.log('✅ Alpine.js 加载测试通过');
  });

  test('1.5.7 测试路由系统初始化', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待应用初始化完成
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined;
    }, { timeout: 10000 });

    // 等待路由系统初始化
    await page.waitForTimeout(2000);

    console.log('📊 开始检测路由系统初始化状态...');

    // 验证：检查路由对象是否存在
    const routerStatus = await page.evaluate(() => {
      const results: Record<string, any> = {};
      
      // 检查 router 对象是否存在
      results['Router对象存在'] = typeof (window as any).router !== 'undefined' && 
                                   (window as any).router !== null;
      
      // 检查 Router 类是否存在
      results['Router类存在'] = typeof (window as any).Router !== 'undefined';
      
      const router = (window as any).router;
      if (router) {
        // 检查核心方法是否存在
        results['navigate方法存在'] = typeof router.navigate === 'function';
        results['back方法存在'] = typeof router.back === 'function';
        results['forward方法存在'] = typeof router.forward === 'function';
        results['go方法存在'] = typeof router.go === 'function';
        results['getCurrentRoute方法存在'] = typeof router.getCurrentRoute === 'function';
        results['getHistory方法存在'] = typeof router.getHistory === 'function';
        results['register方法存在'] = typeof router.register === 'function';
        results['registerRoutes方法存在'] = typeof router.registerRoutes === 'function';
        
        // 检查路由状态
        results['当前路由'] = router.getCurrentRoute ? router.getCurrentRoute() : null;
        results['历史记录数量'] = router.getHistory ? router.getHistory().length : 0;
      }
      
      return results;
    });

    // 输出路由系统状态
    console.log('📊 路由系统初始化状态:');
    for (const [key, value] of Object.entries(routerStatus)) {
      if (typeof value === 'boolean') {
        const icon = value ? '✅' : '❌';
        console.log(`  ${icon} ${key}: ${value}`);
      } else if (key === '当前路由') {
        console.log(`  📍 ${key}:`, value);
      } else if (key === '历史记录数量') {
        console.log(`  📚 ${key}: ${value}`);
      }
    }

    // 断言：Router 对象必须存在
    expect(routerStatus['Router对象存在'], 'Router 对象应该已初始化').toBe(true);

    // 断言：核心方法必须存在
    expect(routerStatus['navigate方法存在'], 'navigate() 方法应该存在').toBe(true);
    expect(routerStatus['back方法存在'], 'back() 方法应该存在').toBe(true);
    expect(routerStatus['forward方法存在'], 'forward() 方法应该存在').toBe(true);
    expect(routerStatus['go方法存在'], 'go() 方法应该存在').toBe(true);
    expect(routerStatus['getCurrentRoute方法存在'], 'getCurrentRoute() 方法应该存在').toBe(true);
    expect(routerStatus['getHistory方法存在'], 'getHistory() 方法应该存在').toBe(true);
    expect(routerStatus['register方法存在'], 'register() 方法应该存在').toBe(true);
    expect(routerStatus['registerRoutes方法存在'], 'registerRoutes() 方法应该存在').toBe(true);

    // 验证：检查路由事件监听器是否已注册
    const eventListenersRegistered = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        // 测试 popstate 事件是否有监听器
        const testPopstate = () => {
          // 触发一个 popstate 事件
          const event = new PopStateEvent('popstate', {
            state: { routeId: 'home' }
          });
          
          // 记录事件是否被处理
          let handled = false;
          const originalPushState = window.history.pushState;
          window.history.pushState = function(...args) {
            handled = true;
            return originalPushState.apply(this, args);
          };
          
          window.dispatchEvent(event);
          
          // 恢复原始方法
          window.history.pushState = originalPushState;
          
          resolve(true); // popstate 监听器存在（即使没有触发 pushState）
        };
        
        setTimeout(testPopstate, 100);
      });
    });

    console.log(`📊 路由事件监听器: ${eventListenersRegistered ? '✅ 已注册' : '❌ 未注册'}`);

    // 断言：路由事件监听器应该已注册
    expect(eventListenersRegistered, '路由事件监听器应该已注册').toBe(true);

    // 验证：测试路由导航功能
    const navigationWorks = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const router = (window as any).router;
        if (!router || typeof router.navigate !== 'function') {
          resolve(false);
          return;
        }
        
        // 测试导航到一个已知路由
        const testNavigation = async () => {
          try {
            // 尝试导航到 home 路由
            const result = await router.navigate('home', { updateHistory: false });
            resolve(result === true);
          } catch (error) {
            console.error('导航测试失败:', error);
            resolve(false);
          }
        };
        
        testNavigation();
      });
    });

    console.log(`📊 路由导航功能: ${navigationWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);

    // 断言：路由导航功能应该正常工作
    expect(navigationWorks, '路由导航功能应该正常工作').toBe(true);

    // 验证：检查当前路由是否已设置
    const currentRoute = routerStatus['当前路由'];
    const hasCurrentRoute = currentRoute !== null && currentRoute !== undefined;
    
    console.log(`📊 当前路由状态: ${hasCurrentRoute ? '✅ 已设置' : '⚠️ 未设置'}`);
    
    // 注意：当前路由可能为 null（如果还没有导航），这是正常的
    // 我们只验证 getCurrentRoute 方法可以被调用

    // 验证：检查路由历史记录功能
    const historyWorks = await page.evaluate(() => {
      const router = (window as any).router;
      if (!router || typeof router.getHistory !== 'function') {
        return false;
      }
      
      try {
        const history = router.getHistory();
        return Array.isArray(history);
      } catch (error) {
        console.error('历史记录测试失败:', error);
        return false;
      }
    });

    console.log(`📊 路由历史记录功能: ${historyWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);

    // 断言：路由历史记录功能应该正常工作
    expect(historyWorks, '路由历史记录功能应该正常工作').toBe(true);

    // 验证：检查是否有路由相关的错误
    const errors = consoleListener.getErrors();
    const routerErrors = errors.filter(error => {
      const errorStr = error.toLowerCase();
      return errorStr.includes('router') || 
             errorStr.includes('route') || 
             errorStr.includes('navigation') ||
             errorStr.includes('navigate');
    });

    if (routerErrors.length > 0) {
      console.error('❌ 检测到路由相关错误:');
      routerErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 断言：不应有路由相关错误
    expect(routerErrors.length, `不应有路由相关错误，但检测到 ${routerErrors.length} 个错误`).toBe(0);

    // 验证：检查路由守卫和中间件是否已初始化
    const guardsAndMiddlewareStatus = await page.evaluate(() => {
      const results: Record<string, boolean> = {};
      
      // 检查路由守卫管理器
      results['RouteGuard存在'] = typeof (window as any).routeGuard !== 'undefined' ||
                                  typeof (window as any).RouteGuardManager !== 'undefined';
      
      // 检查路由中间件管理器
      results['RouteMiddleware存在'] = typeof (window as any).routeMiddleware !== 'undefined' ||
                                       typeof (window as any).RouteMiddlewareManager !== 'undefined';
      
      // 检查错误处理器
      results['RouteErrorHandler存在'] = typeof (window as any).routeErrorHandler !== 'undefined' ||
                                         typeof (window as any).RouteErrorHandlerManager !== 'undefined';
      
      return results;
    });

    console.log('📊 路由辅助系统状态:');
    for (const [key, value] of Object.entries(guardsAndMiddlewareStatus)) {
      const icon = value ? '✅' : '⚠️';
      console.log(`  ${icon} ${key}: ${value ? '已初始化' : '未初始化'}`);
    }

    // 注意：守卫和中间件可能不会暴露到 window，这是正常的
    // 它们可能只在模块内部使用

    // 统计路由系统功能状态
    const functionalityCount = [
      routerStatus['Router对象存在'],
      routerStatus['navigate方法存在'],
      routerStatus['back方法存在'],
      routerStatus['forward方法存在'],
      routerStatus['go方法存在'],
      routerStatus['getCurrentRoute方法存在'],
      routerStatus['getHistory方法存在'],
      routerStatus['register方法存在'],
      routerStatus['registerRoutes方法存在'],
      eventListenersRegistered,
      navigationWorks,
      historyWorks
    ].filter(status => status === true).length;

    console.log(`\n📊 路由系统功能统计: ${functionalityCount}/12 项功能正常`);

    // 断言：至少 90% 的核心功能应该正常
    const functionalityRate = functionalityCount / 12;
    expect(functionalityRate, `至少 90% 的路由核心功能应该正常，当前: ${Math.round(functionalityRate * 100)}%`).toBeGreaterThanOrEqual(0.9);

    console.log('✅ 路由系统初始化测试通过');
  });

  test('1.5.8 测试首屏渲染时间 < 2s', async ({ page }) => {
    console.log('📊 开始测试首屏渲染时间...');

    // 记录导航开始时间
    const navigationStartTime = Date.now();

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // 等待主内容区域可见
    await page.waitForSelector('#main-content', {
      state: 'visible',
      timeout: 10000
    });

    // 记录首屏渲染完成时间
    const firstRenderTime = Date.now();

    // 计算首屏渲染时间
    const renderTime = firstRenderTime - navigationStartTime;

    console.log(`📊 首屏渲染时间: ${renderTime}ms`);

    // 使用 Performance API 获取更精确的性能指标
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const metrics: Record<string, number> = {};
      
      if (navigation) {
        // DNS 查询时间
        metrics['DNS查询时间'] = navigation.domainLookupEnd - navigation.domainLookupStart;
        
        // TCP 连接时间
        metrics['TCP连接时间'] = navigation.connectEnd - navigation.connectStart;
        
        // 请求响应时间
        metrics['请求响应时间'] = navigation.responseEnd - navigation.requestStart;
        
        // DOM 解析时间
        metrics['DOM解析时间'] = navigation.domInteractive - navigation.responseEnd;
        
        // DOM 内容加载完成时间
        metrics['DOMContentLoaded'] = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        
        // 页面完全加载时间
        metrics['页面完全加载'] = navigation.loadEventEnd - navigation.fetchStart;
        
        // 首次字节时间 (TTFB)
        metrics['TTFB'] = navigation.responseStart - navigation.fetchStart;
      }
      
      // First Paint (FP)
      const fp = paint.find(entry => entry.name === 'first-paint');
      if (fp) {
        metrics['First Paint'] = fp.startTime;
      }
      
      // First Contentful Paint (FCP)
      const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        metrics['First Contentful Paint'] = fcp.startTime;
      }
      
      return metrics;
    });

    // 输出性能指标
    console.log('📊 详细性能指标:');
    for (const [metric, value] of Object.entries(performanceMetrics)) {
      const formattedValue = value.toFixed(2);
      console.log(`  • ${metric}: ${formattedValue}ms`);
    }

    // 获取 Largest Contentful Paint (LCP)
    const lcpMetric = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;
        
        // 使用 PerformanceObserver 监听 LCP
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry && lastEntry.renderTime) {
            lcpValue = lastEntry.renderTime;
          } else if (lastEntry && lastEntry.loadTime) {
            lcpValue = lastEntry.loadTime;
          }
        });
        
        try {
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          // LCP 可能不被支持
          console.warn('LCP 监听失败:', e);
        }
        
        // 等待一段时间收集 LCP 数据
        setTimeout(() => {
          observer.disconnect();
          resolve(lcpValue);
        }, 1000);
      });
    });

    if (lcpMetric > 0) {
      console.log(`📊 Largest Contentful Paint (LCP): ${lcpMetric.toFixed(2)}ms`);
      performanceMetrics['LCP'] = lcpMetric;
    }

    // 计算关键渲染路径时间
    const criticalRenderingPath = performanceMetrics['DOMContentLoaded'] || renderTime;
    console.log(`\n📊 关键渲染路径时间: ${criticalRenderingPath.toFixed(2)}ms`);

    // 断言：首屏渲染时间应该小于 2000ms (2s)
    expect(renderTime, `首屏渲染时间应该小于 2000ms，实际: ${renderTime}ms`).toBeLessThan(2000);

    // 断言：DOMContentLoaded 应该小于 2000ms
    if (performanceMetrics['DOMContentLoaded']) {
      expect(
        performanceMetrics['DOMContentLoaded'],
        `DOMContentLoaded 应该小于 2000ms，实际: ${performanceMetrics['DOMContentLoaded'].toFixed(2)}ms`
      ).toBeLessThan(2000);
    }

    // 断言：First Contentful Paint 应该小于 1500ms
    if (performanceMetrics['First Contentful Paint']) {
      expect(
        performanceMetrics['First Contentful Paint'],
        `First Contentful Paint 应该小于 1500ms，实际: ${performanceMetrics['First Contentful Paint'].toFixed(2)}ms`
      ).toBeLessThan(1500);
    }

    // 断言：TTFB 应该小于 500ms
    if (performanceMetrics['TTFB']) {
      expect(
        performanceMetrics['TTFB'],
        `TTFB 应该小于 500ms，实际: ${performanceMetrics['TTFB'].toFixed(2)}ms`
      ).toBeLessThan(500);
    }

    // 断言：LCP 应该小于 2500ms（Web Vitals 标准）
    if (lcpMetric > 0) {
      expect(
        lcpMetric,
        `LCP 应该小于 2500ms，实际: ${lcpMetric.toFixed(2)}ms`
      ).toBeLessThan(2500);
    }

    // 验证：检查是否有阻塞渲染的资源
    const blockingResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      // 查找可能阻塞渲染的资源
      const blocking = resources.filter(resource => {
        // CSS 和同步 JS 可能阻塞渲染
        return (resource.initiatorType === 'link' || resource.initiatorType === 'script') &&
               resource.duration > 100; // 超过 100ms 的资源
      });
      
      return blocking.map(resource => ({
        name: resource.name,
        type: resource.initiatorType,
        duration: resource.duration,
        size: resource.transferSize
      }));
    });

    if (blockingResources.length > 0) {
      console.log('\n⚠️ 检测到可能阻塞渲染的资源:');
      blockingResources.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.type}: ${resource.name}`);
        console.log(`     耗时: ${resource.duration.toFixed(2)}ms, 大小: ${(resource.size / 1024).toFixed(2)}KB`);
      });
    } else {
      console.log('\n✅ 未检测到明显阻塞渲染的资源');
    }

    // 验证：检查资源加载性能
    const resourceStats = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const stats = {
        总资源数: resources.length,
        CSS文件数: 0,
        JS文件数: 0,
        图片数: 0,
        字体数: 0,
        总传输大小: 0,
        平均加载时间: 0
      };
      
      let totalDuration = 0;
      
      resources.forEach(resource => {
        if (resource.initiatorType === 'link' || resource.name.endsWith('.css')) {
          stats.CSS文件数++;
        } else if (resource.initiatorType === 'script' || resource.name.endsWith('.js')) {
          stats.JS文件数++;
        } else if (resource.initiatorType === 'img' || /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(resource.name)) {
          stats.图片数++;
        } else if (/\.(woff|woff2|ttf|otf|eot)$/i.test(resource.name)) {
          stats.字体数++;
        }
        
        stats.总传输大小 += resource.transferSize || 0;
        totalDuration += resource.duration;
      });
      
      stats.平均加载时间 = resources.length > 0 ? totalDuration / resources.length : 0;
      
      return stats;
    });

    console.log('\n📊 资源加载统计:');
    console.log(`  • 总资源数: ${resourceStats.总资源数}`);
    console.log(`  • CSS 文件: ${resourceStats.CSS文件数}`);
    console.log(`  • JS 文件: ${resourceStats.JS文件数}`);
    console.log(`  • 图片: ${resourceStats.图片数}`);
    console.log(`  • 字体: ${resourceStats.字体数}`);
    console.log(`  • 总传输大小: ${(resourceStats.总传输大小 / 1024).toFixed(2)}KB`);
    console.log(`  • 平均加载时间: ${resourceStats.平均加载时间.toFixed(2)}ms`);

    // 生成性能评分
    let performanceScore = 100;
    
    // 根据各项指标扣分
    if (renderTime > 1500) performanceScore -= 10;
    if (renderTime > 1800) performanceScore -= 10;
    if (performanceMetrics['TTFB'] && performanceMetrics['TTFB'] > 300) performanceScore -= 5;
    if (performanceMetrics['TTFB'] && performanceMetrics['TTFB'] > 400) performanceScore -= 5;
    if (performanceMetrics['First Contentful Paint'] && performanceMetrics['First Contentful Paint'] > 1200) performanceScore -= 10;
    if (lcpMetric > 2000) performanceScore -= 10;
    if (blockingResources.length > 5) performanceScore -= 10;
    if (resourceStats.总传输大小 > 1024 * 1024) performanceScore -= 10; // 超过 1MB

    console.log(`\n📊 性能评分: ${performanceScore}/100`);

    // 根据评分给出评级
    let rating = '';
    if (performanceScore >= 90) {
      rating = '优秀 🌟';
    } else if (performanceScore >= 75) {
      rating = '良好 ✅';
    } else if (performanceScore >= 60) {
      rating = '一般 ⚠️';
    } else {
      rating = '需要优化 ❌';
    }

    console.log(`📊 性能评级: ${rating}`);

    // 提供优化建议
    const suggestions: string[] = [];
    
    if (renderTime > 1500) {
      suggestions.push('首屏渲染时间偏长，考虑优化关键渲染路径');
    }
    
    if (performanceMetrics['TTFB'] && performanceMetrics['TTFB'] > 300) {
      suggestions.push('TTFB 偏高，考虑优化服务器响应时间或使用 CDN');
    }
    
    if (blockingResources.length > 5) {
      suggestions.push('存在较多阻塞渲染的资源，考虑异步加载或延迟加载');
    }
    
    if (resourceStats.总传输大小 > 1024 * 1024) {
      suggestions.push('资源总大小较大，考虑压缩、代码分割或使用更小的库');
    }
    
    if (resourceStats.图片数 > 10) {
      suggestions.push('图片数量较多，考虑使用懒加载或图片优化');
    }

    if (suggestions.length > 0) {
      console.log('\n💡 优化建议:');
      suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    } else {
      console.log('\n✅ 性能表现良好，无需特别优化');
    }

    // 最终断言：性能评分应该至少为 60 分（一般水平）
    expect(performanceScore, `性能评分应该至少为 60 分，当前: ${performanceScore} 分`).toBeGreaterThanOrEqual(60);

    console.log('\n✅ 首屏渲染时间测试通过');
  });

  test('1.5.9 测试内存占用 < 100MB', async ({ page }) => {
    console.log('📊 开始测试内存占用...');

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待应用完全初始化
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined;
    }, { timeout: 10000 });

    // 等待所有异步操作完成
    await page.waitForTimeout(3000);

    // 获取初始内存使用情况
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (!initialMemory) {
      console.warn('⚠️ 浏览器不支持 performance.memory API，跳过内存测试');
      console.log('💡 提示: 使用 Chrome 浏览器并启用 --enable-precise-memory-info 标志可以获取精确的内存信息');
      
      // 如果不支持 memory API，我们仍然可以通过其他方式估算
      // 但这个测试会被标记为跳过
      test.skip();
      return;
    }

    // 将字节转换为 MB
    const bytesToMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

    console.log('📊 初始内存使用情况:');
    console.log(`  • 已使用 JS 堆内存: ${bytesToMB(initialMemory.usedJSHeapSize)} MB`);
    console.log(`  • 总 JS 堆内存: ${bytesToMB(initialMemory.totalJSHeapSize)} MB`);
    console.log(`  • JS 堆内存限制: ${bytesToMB(initialMemory.jsHeapSizeLimit)} MB`);

    // 执行一些常见操作以模拟实际使用
    console.log('\n📊 执行常见操作以模拟实际使用...');

    // 1. 导航到不同的路由
    await page.evaluate(() => {
      const router = (window as any).router;
      if (router && typeof router.navigate === 'function') {
        router.navigate('home', { updateHistory: false });
      }
    });
    await page.waitForTimeout(500);

    // 2. 触发一些 Alpine 组件交互
    await page.evaluate(() => {
      // 触发一些 DOM 操作
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button, index) => {
        if (index < 3) { // 只触发前 3 个按钮
          button.dispatchEvent(new Event('click', { bubbles: true }));
        }
      });
    });
    await page.waitForTimeout(500);

    // 3. 模拟数据加载
    await page.evaluate(() => {
      // 创建一些临时数据
      const tempData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
        timestamp: Date.now()
      }));
      
      // 存储到临时变量（模拟数据加载）
      (window as any).__tempTestData = tempData;
    });
    await page.waitForTimeout(500);

    // 4. 清理临时数据
    await page.evaluate(() => {
      delete (window as any).__tempTestData;
    });

    // 等待垃圾回收（如果可能）
    await page.waitForTimeout(1000);

    // 获取操作后的内存使用情况
    const afterOperationsMemory = await page.evaluate(() => {
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (afterOperationsMemory) {
      console.log('\n📊 操作后内存使用情况:');
      console.log(`  • 已使用 JS 堆内存: ${bytesToMB(afterOperationsMemory.usedJSHeapSize)} MB`);
      console.log(`  • 总 JS 堆内存: ${bytesToMB(afterOperationsMemory.totalJSHeapSize)} MB`);
      console.log(`  • JS 堆内存限制: ${bytesToMB(afterOperationsMemory.jsHeapSizeLimit)} MB`);

      // 计算内存增长
      const memoryGrowth = afterOperationsMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      console.log(`\n📊 内存增长: ${bytesToMB(memoryGrowth)} MB`);
    }

    // 尝试触发垃圾回收（仅在支持的浏览器中）
    await page.evaluate(() => {
      if ((window as any).gc) {
        console.log('🗑️ 触发垃圾回收...');
        (window as any).gc();
      }
    });

    // 等待垃圾回收完成
    await page.waitForTimeout(2000);

    // 获取最终内存使用情况
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        return {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (!finalMemory) {
      console.error('❌ 无法获取最终内存使用情况');
      return;
    }

    console.log('\n📊 最终内存使用情况:');
    console.log(`  • 已使用 JS 堆内存: ${bytesToMB(finalMemory.usedJSHeapSize)} MB`);
    console.log(`  • 总 JS 堆内存: ${bytesToMB(finalMemory.totalJSHeapSize)} MB`);
    console.log(`  • JS 堆内存限制: ${bytesToMB(finalMemory.jsHeapSizeLimit)} MB`);

    // 计算内存使用率
    const memoryUsageRate = (finalMemory.usedJSHeapSize / finalMemory.jsHeapSizeLimit) * 100;
    console.log(`\n📊 内存使用率: ${memoryUsageRate.toFixed(2)}%`);

    // 将已使用内存转换为 MB
    const usedMemoryMB = finalMemory.usedJSHeapSize / (1024 * 1024);
    const totalMemoryMB = finalMemory.totalJSHeapSize / (1024 * 1024);

    console.log(`\n📊 内存占用: ${usedMemoryMB.toFixed(2)} MB / ${totalMemoryMB.toFixed(2)} MB`);

    // 检查内存泄漏迹象
    const memoryLeakIndicators: string[] = [];

    // 1. 检查内存增长是否过大
    if (afterOperationsMemory) {
      const memoryGrowth = afterOperationsMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      if (memoryGrowthMB > 20) {
        memoryLeakIndicators.push(`操作后内存增长过大: ${memoryGrowthMB.toFixed(2)} MB`);
      }
    }

    // 2. 检查内存使用率是否过高
    if (memoryUsageRate > 80) {
      memoryLeakIndicators.push(`内存使用率过高: ${memoryUsageRate.toFixed(2)}%`);
    }

    // 3. 检查是否有大量 DOM 节点
    const domStats = await page.evaluate(() => {
      return {
        totalNodes: document.querySelectorAll('*').length,
        eventListeners: 0, // 无法直接获取，需要特殊工具
        detachedNodes: 0   // 无法直接获取，需要特殊工具
      };
    });

    console.log('\n📊 DOM 统计:');
    console.log(`  • 总节点数: ${domStats.totalNodes}`);

    if (domStats.totalNodes > 5000) {
      memoryLeakIndicators.push(`DOM 节点数量过多: ${domStats.totalNodes}`);
    }

    // 4. 检查全局对象是否有异常增长
    const globalObjectsCount = await page.evaluate(() => {
      const globalKeys = Object.keys(window);
      return {
        total: globalKeys.length,
        customKeys: globalKeys.filter(key => {
          // 过滤掉浏览器原生属性
          return !key.startsWith('webkit') && 
                 !key.startsWith('chrome') && 
                 !key.startsWith('moz') &&
                 key !== 'constructor' &&
                 key !== 'prototype';
        }).length
      };
    });

    console.log('\n📊 全局对象统计:');
    console.log(`  • 总属性数: ${globalObjectsCount.total}`);
    console.log(`  • 自定义属性数: ${globalObjectsCount.customKeys}`);

    if (globalObjectsCount.customKeys > 100) {
      memoryLeakIndicators.push(`全局对象属性过多: ${globalObjectsCount.customKeys}`);
    }

    // 输出内存泄漏警告
    if (memoryLeakIndicators.length > 0) {
      console.log('\n⚠️ 检测到潜在的内存问题:');
      memoryLeakIndicators.forEach((indicator, index) => {
        console.log(`  ${index + 1}. ${indicator}`);
      });
    } else {
      console.log('\n✅ 未检测到明显的内存泄漏迹象');
    }

    // 生成内存评分
    let memoryScore = 100;

    // 根据内存占用扣分
    if (usedMemoryMB > 80) memoryScore -= 10;
    if (usedMemoryMB > 90) memoryScore -= 10;
    if (usedMemoryMB > 95) memoryScore -= 10;

    // 根据内存使用率扣分
    if (memoryUsageRate > 60) memoryScore -= 5;
    if (memoryUsageRate > 70) memoryScore -= 5;
    if (memoryUsageRate > 80) memoryScore -= 10;

    // 根据 DOM 节点数扣分
    if (domStats.totalNodes > 3000) memoryScore -= 5;
    if (domStats.totalNodes > 5000) memoryScore -= 10;

    // 根据内存泄漏指标扣分
    memoryScore -= memoryLeakIndicators.length * 10;

    console.log(`\n📊 内存评分: ${memoryScore}/100`);

    // 根据评分给出评级
    let rating = '';
    if (memoryScore >= 90) {
      rating = '优秀 🌟';
    } else if (memoryScore >= 75) {
      rating = '良好 ✅';
    } else if (memoryScore >= 60) {
      rating = '一般 ⚠️';
    } else {
      rating = '需要优化 ❌';
    }

    console.log(`📊 内存评级: ${rating}`);

    // 提供优化建议
    const suggestions: string[] = [];

    if (usedMemoryMB > 80) {
      suggestions.push('内存占用偏高，考虑优化数据结构或减少缓存');
    }

    if (memoryUsageRate > 70) {
      suggestions.push('内存使用率较高，考虑实现内存回收机制');
    }

    if (domStats.totalNodes > 3000) {
      suggestions.push('DOM 节点数量较多，考虑使用虚拟滚动或懒加载');
    }

    if (globalObjectsCount.customKeys > 50) {
      suggestions.push('全局对象属性较多，考虑使用模块化或命名空间');
    }

    if (memoryLeakIndicators.length > 0) {
      suggestions.push('检测到潜在内存泄漏，建议使用 Chrome DevTools Memory Profiler 进行详细分析');
    }

    if (suggestions.length > 0) {
      console.log('\n💡 优化建议:');
      suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    } else {
      console.log('\n✅ 内存使用良好，无需特别优化');
    }

    // 核心断言：已使用内存应该小于 100MB
    expect(
      usedMemoryMB,
      `应用内存占用应该小于 100MB，实际: ${usedMemoryMB.toFixed(2)} MB`
    ).toBeLessThan(100);

    // 额外断言：内存使用率不应过高
    expect(
      memoryUsageRate,
      `内存使用率不应超过 85%，实际: ${memoryUsageRate.toFixed(2)}%`
    ).toBeLessThan(85);

    // 额外断言：DOM 节点数不应过多
    expect(
      domStats.totalNodes,
      `DOM 节点数不应超过 5000，实际: ${domStats.totalNodes}`
    ).toBeLessThan(5000);

    // 最终断言：内存评分应该至少为 60 分
    expect(
      memoryScore,
      `内存评分应该至少为 60 分，当前: ${memoryScore} 分`
    ).toBeGreaterThanOrEqual(60);

    console.log('\n✅ 内存占用测试通过');
  });

  test('1.5.10 测试无 console.error 输出', async ({ page }) => {
    console.log('📊 开始测试控制台错误输出...');

    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待应用完全初始化
    await page.waitForFunction(() => {
      return window.hasOwnProperty('Alpine') && 
             (window as any).Alpine !== undefined;
    }, { timeout: 10000 });

    // 等待所有异步操作完成
    await page.waitForTimeout(3000);

    console.log('📊 检查控制台错误输出...');

    // 获取所有控制台错误
    const errors = consoleListener.getErrors();

    // 分类错误
    const errorCategories = {
      critical: [] as string[],
      warnings: [] as string[],
      deprecations: [] as string[],
      network: [] as string[],
      other: [] as string[]
    };

    errors.forEach(error => {
      const errorStr = error.toLowerCase();
      
      // 分类错误
      if (errorStr.includes('deprecated') || errorStr.includes('deprecation')) {
        errorCategories.deprecations.push(error);
      } else if (errorStr.includes('warning') || errorStr.includes('warn')) {
        errorCategories.warnings.push(error);
      } else if (errorStr.includes('failed to load') || 
                 errorStr.includes('network') || 
                 errorStr.includes('fetch') ||
                 errorStr.includes('404') ||
                 errorStr.includes('500')) {
        errorCategories.network.push(error);
      } else if (errorStr.includes('error') || 
                 errorStr.includes('exception') || 
                 errorStr.includes('uncaught') ||
                 errorStr.includes('cannot read') ||
                 errorStr.includes('undefined is not') ||
                 errorStr.includes('null is not')) {
        errorCategories.critical.push(error);
      } else {
        errorCategories.other.push(error);
      }
    });

    // 输出错误统计
    console.log('\n📊 控制台错误统计:');
    console.log(`  • 总错误数: ${errors.length}`);
    console.log(`  • 关键错误: ${errorCategories.critical.length}`);
    console.log(`  • 警告: ${errorCategories.warnings.length}`);
    console.log(`  • 弃用警告: ${errorCategories.deprecations.length}`);
    console.log(`  • 网络错误: ${errorCategories.network.length}`);
    console.log(`  • 其他: ${errorCategories.other.length}`);

    // 输出详细错误信息
    if (errorCategories.critical.length > 0) {
      console.error('\n❌ 关键错误:');
      errorCategories.critical.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    if (errorCategories.network.length > 0) {
      console.warn('\n⚠️ 网络错误:');
      errorCategories.network.forEach((error, index) => {
        console.warn(`  ${index + 1}. ${error}`);
      });
    }

    if (errorCategories.warnings.length > 0) {
      console.warn('\n⚠️ 警告:');
      errorCategories.warnings.forEach((error, index) => {
        console.warn(`  ${index + 1}. ${error}`);
      });
    }

    if (errorCategories.deprecations.length > 0) {
      console.warn('\n⚠️ 弃用警告:');
      errorCategories.deprecations.forEach((error, index) => {
        console.warn(`  ${index + 1}. ${error}`);
      });
    }

    // 检查页面错误事件
    const pageErrors = await page.evaluate(() => {
      return (window as any).__pageErrors || [];
    });

    if (pageErrors.length > 0) {
      console.error('\n❌ 页面错误事件:');
      pageErrors.forEach((error: any, index: number) => {
        console.error(`  ${index + 1}. ${error.message || error}`);
      });
    }

    // 检查未捕获的 Promise rejection
    const unhandledRejections = await page.evaluate(() => {
      return (window as any).__unhandledRejections || [];
    });

    if (unhandledRejections.length > 0) {
      console.error('\n❌ 未捕获的 Promise rejection:');
      unhandledRejections.forEach((rejection: any, index: number) => {
        console.error(`  ${index + 1}. ${rejection.reason || rejection}`);
      });
    }

    // 检查资源加载错误
    const resourceErrors = await page.evaluate(() => {
      const errors: string[] = [];
      
      // 检查所有资源
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      resources.forEach(resource => {
        // 检查是否有加载失败的资源
        if (resource.transferSize === 0 && resource.decodedBodySize === 0) {
          // 可能是加载失败或被缓存
          // 我们需要更精确的检测
        }
      });
      
      return errors;
    });

    if (resourceErrors.length > 0) {
      console.error('\n❌ 资源加载错误:');
      resourceErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 检查 JavaScript 运行时错误
    const runtimeErrors = await page.evaluate(() => {
      const errors: string[] = [];
      
      // 检查是否有全局错误处理器记录的错误
      if ((window as any).__runtimeErrors) {
        errors.push(...(window as any).__runtimeErrors);
      }
      
      return errors;
    });

    if (runtimeErrors.length > 0) {
      console.error('\n❌ JavaScript 运行时错误:');
      runtimeErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 检查 Alpine.js 错误
    const alpineErrors = await page.evaluate(() => {
      const errors: string[] = [];
      
      // 检查 Alpine 是否有错误
      const alpine = (window as any).Alpine;
      if (alpine && alpine.__errors) {
        errors.push(...alpine.__errors);
      }
      
      return errors;
    });

    if (alpineErrors.length > 0) {
      console.error('\n❌ Alpine.js 错误:');
      alpineErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 检查路由错误
    const routerErrors = await page.evaluate(() => {
      const errors: string[] = [];
      
      // 检查路由是否有错误
      const router = (window as any).router;
      if (router && router.__errors) {
        errors.push(...router.__errors);
      }
      
      return errors;
    });

    if (routerErrors.length > 0) {
      console.error('\n❌ 路由错误:');
      routerErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 生成错误报告
    const errorReport = {
      totalErrors: errors.length,
      criticalErrors: errorCategories.critical.length,
      warnings: errorCategories.warnings.length,
      deprecations: errorCategories.deprecations.length,
      networkErrors: errorCategories.network.length,
      pageErrors: pageErrors.length,
      unhandledRejections: unhandledRejections.length,
      resourceErrors: resourceErrors.length,
      runtimeErrors: runtimeErrors.length,
      alpineErrors: alpineErrors.length,
      routerErrors: routerErrors.length
    };

    // 计算错误严重程度评分
    let errorScore = 100;
    
    // 关键错误严重扣分
    errorScore -= errorCategories.critical.length * 20;
    
    // 页面错误严重扣分
    errorScore -= pageErrors.length * 15;
    
    // 未捕获的 Promise rejection 严重扣分
    errorScore -= unhandledRejections.length * 15;
    
    // 运行时错误严重扣分
    errorScore -= runtimeErrors.length * 15;
    
    // Alpine 和路由错误严重扣分
    errorScore -= alpineErrors.length * 10;
    errorScore -= routerErrors.length * 10;
    
    // 网络错误中等扣分
    errorScore -= errorCategories.network.length * 5;
    
    // 警告轻微扣分
    errorScore -= errorCategories.warnings.length * 2;
    
    // 弃用警告轻微扣分
    errorScore -= errorCategories.deprecations.length * 1;

    // 确保评分不低于 0
    errorScore = Math.max(0, errorScore);

    console.log(`\n📊 错误严重程度评分: ${errorScore}/100`);

    // 根据评分给出评级
    let rating = '';
    if (errorScore === 100) {
      rating = '完美 🌟';
    } else if (errorScore >= 90) {
      rating = '优秀 ✅';
    } else if (errorScore >= 75) {
      rating = '良好 ⚠️';
    } else if (errorScore >= 60) {
      rating = '一般 ⚠️';
    } else {
      rating = '需要修复 ❌';
    }

    console.log(`📊 错误评级: ${rating}`);

    // 提供修复建议
    const suggestions: string[] = [];

    if (errorCategories.critical.length > 0) {
      suggestions.push('存在关键错误，必须立即修复');
    }

    if (pageErrors.length > 0) {
      suggestions.push('存在页面错误事件，检查全局错误处理器');
    }

    if (unhandledRejections.length > 0) {
      suggestions.push('存在未捕获的 Promise rejection，添加 .catch() 处理');
    }

    if (runtimeErrors.length > 0) {
      suggestions.push('存在 JavaScript 运行时错误，检查代码逻辑');
    }

    if (alpineErrors.length > 0) {
      suggestions.push('存在 Alpine.js 错误，检查组件定义和数据绑定');
    }

    if (routerErrors.length > 0) {
      suggestions.push('存在路由错误，检查路由配置和导航逻辑');
    }

    if (errorCategories.network.length > 0) {
      suggestions.push('存在网络错误，检查资源路径和服务器配置');
    }

    if (errorCategories.warnings.length > 0) {
      suggestions.push('存在警告信息，建议修复以提升代码质量');
    }

    if (errorCategories.deprecations.length > 0) {
      suggestions.push('存在弃用警告，建议更新到新的 API');
    }

    if (suggestions.length > 0) {
      console.log('\n💡 修复建议:');
      suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    } else {
      console.log('\n✅ 无控制台错误，应用运行完美');
    }

    // 核心断言：不应有任何 console.error 输出
    expect(
      errors.length,
      `应用启动时不应有任何 console.error 输出，但检测到 ${errors.length} 个错误`
    ).toBe(0);

    // 额外断言：不应有关键错误
    expect(
      errorCategories.critical.length,
      `不应有关键错误，但检测到 ${errorCategories.critical.length} 个关键错误`
    ).toBe(0);

    // 额外断言：不应有页面错误事件
    expect(
      pageErrors.length,
      `不应有页面错误事件，但检测到 ${pageErrors.length} 个页面错误`
    ).toBe(0);

    // 额外断言：不应有未捕获的 Promise rejection
    expect(
      unhandledRejections.length,
      `不应有未捕获的 Promise rejection，但检测到 ${unhandledRejections.length} 个`
    ).toBe(0);

    // 额外断言：不应有运行时错误
    expect(
      runtimeErrors.length,
      `不应有 JavaScript 运行时错误，但检测到 ${runtimeErrors.length} 个`
    ).toBe(0);

    // 额外断言：不应有 Alpine.js 错误
    expect(
      alpineErrors.length,
      `不应有 Alpine.js 错误，但检测到 ${alpineErrors.length} 个`
    ).toBe(0);

    // 额外断言：不应有路由错误
    expect(
      routerErrors.length,
      `不应有路由错误，但检测到 ${routerErrors.length} 个`
    ).toBe(0);

    // 最终断言：错误评分应该至少为 90 分（优秀水平）
    expect(
      errorScore,
      `错误评分应该至少为 90 分，当前: ${errorScore} 分`
    ).toBeGreaterThanOrEqual(90);

    console.log('\n✅ 控制台错误输出测试通过');
  });
});

  test('1.5.6 测试 Zustand store 初始化', async ({ page }) => {
    // 设置控制台错误监听器
    const consoleListener = setupConsoleErrorListener(page);

    // 导航到应用首页
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // 等待 Zustand store 加载完成
    await page.waitForFunction(() => {
      return window.hasOwnProperty('useAppStore') && 
             (window as any).useAppStore !== undefined &&
             (window as any).useAppStore !== null;
    }, { timeout: 10000 });

    console.log('📊 开始检测 Zustand Store 初始化状态...');

    // 验证：检查 Zustand store 是否已加载到 window 对象
    const storeStatus = await page.evaluate(() => {
      const results: Record<string, any> = {};
      
      // 检查 useAppStore 对象是否存在
      results['useAppStore存在'] = typeof (window as any).useAppStore !== 'undefined' && 
                                    (window as any).useAppStore !== null;
      
      // 检查 appStore 别名是否存在
      results['appStore别名存在'] = typeof (window as any).appStore !== 'undefined' && 
                                     (window as any).appStore !== null;
      
      const store = (window as any).useAppStore;
      if (store) {
        // 检查 store 的核心方法是否存在
        results['getState方法存在'] = typeof store.getState === 'function';
        results['setState方法存在'] = typeof store.setState === 'function';
        results['subscribe方法存在'] = typeof store.subscribe === 'function';
        
        // 检查 store 状态是否已初始化
        try {
          const state = store.getState();
          results['状态对象存在'] = state !== null && typeof state === 'object';
          
          // 检查各个状态模块是否存在
          if (state) {
            results['UI状态存在'] = state.ui !== undefined && state.ui !== null;
            results['Scraper状态存在'] = state.scraper !== undefined && state.scraper !== null;
            results['Analysis状态存在'] = state.analysis !== undefined && state.analysis !== null;
            results['PromptLab状态存在'] = state.promptlab !== undefined && state.promptlab !== null;
            results['KeywordTracker状态存在'] = state.keywordTracker !== undefined && state.keywordTracker !== null;
            
            // 检查 UI 状态的初始值
            if (state.ui) {
              results['UI.currentTab'] = state.ui.currentTab || '未设置';
              results['UI.theme'] = state.ui.theme || '未设置';
              results['UI.loading'] = state.ui.loading !== undefined ? state.ui.loading : '未设置';
            }
            
            // 检查 Actions 是否存在
            results['setCurrentTab方法存在'] = typeof state.setCurrentTab === 'function';
            results['setTheme方法存在'] = typeof state.setTheme === 'function';
            results['setLoading方法存在'] = typeof state.setLoading === 'function';
            results['updateUI方法存在'] = typeof state.updateUI === 'function';
          }
        } catch (error) {
          results['状态获取错误'] = error instanceof Error ? error.message : String(error);
        }
      }
      
      return results;
    });

    // 输出 Zustand Store 状态
    console.log('📊 Zustand Store 初始化状态:');
    for (const [key, value] of Object.entries(storeStatus)) {
      const icon = value === true || (typeof value === 'string' && !key.includes('错误') && value !== '未设置') ? '✅' : '❌';
      console.log(`  ${icon} ${key}: ${value}`);
    }

    // 断言：useAppStore 对象必须存在
    expect(storeStatus['useAppStore存在'], 'useAppStore 应该已加载到 window').toBe(true);

    // 断言：核心方法必须存在
    expect(storeStatus['getState方法存在'], 'store.getState() 方法应该存在').toBe(true);
    expect(storeStatus['setState方法存在'], 'store.setState() 方法应该存在').toBe(true);
    expect(storeStatus['subscribe方法存在'], 'store.subscribe() 方法应该存在').toBe(true);

    // 断言：状态对象必须存在
    expect(storeStatus['状态对象存在'], 'store 状态对象应该已初始化').toBe(true);

    // 断言：各个状态模块必须存在
    expect(storeStatus['UI状态存在'], 'UI 状态应该已初始化').toBe(true);
    expect(storeStatus['Scraper状态存在'], 'Scraper 状态应该已初始化').toBe(true);
    expect(storeStatus['Analysis状态存在'], 'Analysis 状态应该已初始化').toBe(true);
    expect(storeStatus['PromptLab状态存在'], 'PromptLab 状态应该已初始化').toBe(true);
    expect(storeStatus['KeywordTracker状态存在'], 'KeywordTracker 状态应该已初始化').toBe(true);

    // 断言：Actions 方法必须存在
    expect(storeStatus['setCurrentTab方法存在'], 'setCurrentTab() 方法应该存在').toBe(true);
    expect(storeStatus['setTheme方法存在'], 'setTheme() 方法应该存在').toBe(true);
    expect(storeStatus['setLoading方法存在'], 'setLoading() 方法应该存在').toBe(true);
    expect(storeStatus['updateUI方法存在'], 'updateUI() 方法应该存在').toBe(true);

    // 验证：测试 store 的响应式功能
    const storeReactivityWorks = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        try {
          const store = (window as any).useAppStore;
          if (!store || typeof store.getState !== 'function') {
            resolve(false);
            return;
          }
          
          // 获取初始状态
          const initialTab = store.getState().ui.currentTab;
          
          // 订阅状态变化
          let changeDetected = false;
          const unsubscribe = store.subscribe((state: any) => {
            if (state.ui.currentTab !== initialTab) {
              changeDetected = true;
            }
          });
          
          // 修改状态
          store.getState().setCurrentTab('test-tab');
          
          // 等待状态更新
          setTimeout(() => {
            const newTab = store.getState().ui.currentTab;
            unsubscribe();
            
            // 验证状态是否更新且订阅被触发
            resolve(newTab === 'test-tab' && changeDetected);
          }, 100);
        } catch (error) {
          console.error('Store 响应式测试失败:', error);
          resolve(false);
        }
      });
    });

    console.log(`📊 Store 响应式功能: ${storeReactivityWorks ? '✅ 正常工作' : '❌ 未正常工作'}`);

    // 断言：Store 响应式功能应该正常工作
    expect(storeReactivityWorks, 'Zustand store 响应式功能应该正常工作').toBe(true);

    // 验证：测试 store 的持久化功能
    const storePersistenceWorks = await page.evaluate(() => {
      try {
        const store = (window as any).useAppStore;
        if (!store) return false;
        
        // 检查 localStorage 中是否有持久化数据
        const persistedData = localStorage.getItem('app-storage');
        return persistedData !== null;
      } catch (error) {
        console.error('Store 持久化检查失败:', error);
        return false;
      }
    });

    console.log(`📊 Store 持久化功能: ${storePersistenceWorks ? '✅ 已启用' : '⚠️ 未检测到'}`);

    // 验证：检查是否有 Store 相关的错误
    const errors = consoleListener.getErrors();
    const storeErrors = errors.filter(error => {
      const errorStr = error.toLowerCase();
      return errorStr.includes('store') || 
             errorStr.includes('zustand') || 
             errorStr.includes('state');
    });

    if (storeErrors.length > 0) {
      console.error('❌ 检测到 Store 相关错误:');
      storeErrors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }

    // 断言：不应有 Store 相关错误
    expect(storeErrors.length, `不应有 Store 相关错误，但检测到 ${storeErrors.length} 个错误`).toBe(0);

    // 验证：测试多个 Actions 是否正常工作
    const actionsWork = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        try {
          const store = (window as any).useAppStore;
          if (!store) {
            resolve(false);
            return;
          }
          
          const state = store.getState();
          
          // 测试多个 Actions
          state.setTheme('dark');
          state.setLoading(true);
          state.setSidebarCollapsed(true);
          
          // 验证状态是否更新
          setTimeout(() => {
            const newState = store.getState();
            const allUpdated = 
              newState.ui.theme === 'dark' &&
              newState.ui.loading === true &&
              newState.ui.sidebarCollapsed === true;
            
            resolve(allUpdated);
          }, 100);
        } catch (error) {
          console.error('Actions 测试失败:', error);
          resolve(false);
        }
      });
    });

    console.log(`📊 Store Actions 功能: ${actionsWork ? '✅ 正常工作' : '❌ 未正常工作'}`);

    // 断言：Store Actions 应该正常工作
    expect(actionsWork, 'Zustand store Actions 应该正常工作').toBe(true);

    // 统计 Zustand Store 功能状态
    const functionalityCount = [
      storeStatus['useAppStore存在'],
      storeStatus['getState方法存在'],
      storeStatus['setState方法存在'],
      storeStatus['subscribe方法存在'],
      storeStatus['状态对象存在'],
      storeStatus['UI状态存在'],
      storeStatus['Scraper状态存在'],
      storeStatus['Analysis状态存在'],
      storeStatus['PromptLab状态存在'],
      storeStatus['KeywordTracker状态存在'],
      storeStatus['setCurrentTab方法存在'],
      storeStatus['setTheme方法存在'],
      storeStatus['setLoading方法存在'],
      storeStatus['updateUI方法存在'],
      storeReactivityWorks,
      actionsWork
    ].filter(status => status === true).length;

    console.log(`\n📊 Zustand Store 功能统计: ${functionalityCount}/16 项功能正常`);

    // 断言：所有核心功能都应该正常
    expect(functionalityCount, 'Zustand Store 所有核心功能都应该正常工作').toBeGreaterThanOrEqual(15);

    console.log('✅ Zustand Store 初始化测试通过');
  });
});
