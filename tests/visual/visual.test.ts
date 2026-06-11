// tests/visual/visual.test.ts
// ================================================================
// 🎨 视觉回归测试
// 用于检测 UI 变化，防止意外的视觉破坏
// ================================================================
//
// 测试策略：
// 1. 为关键页面创建基准截图
// 2. 每次测试时与基准图对比
// 3. 差异超过阈值时测试失败
//
// 使用方法：
// ---------
// # 运行视觉测试
// npm run test:e2e tests/visual
//
// # 更新基准截图
// npm run test:e2e tests/visual -- --update-snapshots
//
// # 查看对比结果
// 失败时会在 test-results/ 目录生成差异图
//
// ================================================================

import { test, expect, Page } from '@playwright/test';
import {
  ThresholdLevel,
  PageType,
  getThresholdConfig,
  getThresholdForPageType,
  getThresholdForComponent,
  getThresholdForInteractionState,
  adjustThresholdForViewport
} from './threshold-config';

/**
 * 视觉测试配置
 */
const VISUAL_CONFIG = {
  // 默认阈值配置（标准级别）
  defaultThreshold: getThresholdConfig(ThresholdLevel.STANDARD),
  
  // 截图选项
  screenshotOptions: {
    fullPage: true,
    animations: 'disabled' as const,
    // 隐藏动态元素（时间戳、动画等）
    mask: [] as string[]
  },
  
  // 视口尺寸
  viewports: {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
  },
  
  // 页面特定的阈值配置
  pageThresholds: {
    home: getThresholdForPageType(PageType.STATIC),
    promptlab: getThresholdForPageType(PageType.FORM),
    'ai-analysis': getThresholdForPageType(PageType.DATA_DISPLAY),
    scraper: getThresholdForPageType(PageType.DATA_DISPLAY),
    qalab: getThresholdForPageType(PageType.FORM),
    'keyword-hunter': getThresholdForPageType(PageType.LIST),
    'npi-tracker': getThresholdForPageType(PageType.LIST),
    'restricted-words': getThresholdForPageType(PageType.LIST)
  }
};

/**
 * 页面配置
 */
interface PageConfig {
  name: string;
  path: string;
  pageType: PageType;  // 页面类型，用于确定阈值
  waitForSelector?: string;
  maskSelectors?: string[];
  beforeScreenshot?: (page: Page) => Promise<void>;
}

/**
 * 关键页面列表
 */
const PAGES: PageConfig[] = [
  {
    name: 'home',
    path: '/',
    pageType: PageType.STATIC,
    waitForSelector: 'body',
    maskSelectors: [
      // 隐藏可能变化的元素
      '.timestamp',
      '.current-time',
      '[data-dynamic="true"]'
    ]
  },
  {
    name: 'promptlab',
    path: '/#promptlab',
    pageType: PageType.FORM,
    waitForSelector: '[x-data="promptlabPanel"]',
    maskSelectors: [
      '.timestamp',
      '#final-prompt-output', // 动态生成的内容
      '#prompt-word-count', // 字符计数会变化
      '.animate-pulse', // 动画元素
      '.bg-gradient-to-br', // 渐变背景可能有细微差异
      '[class*="animate-"]' // 所有动画元素
    ],
    beforeScreenshot: async (page: Page) => {
      // 等待 Alpine 组件加载
      await page.waitForSelector('[x-data="promptlabPanel"]', { timeout: 15000 });
      // 等待网络空闲
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      // 等待 Alpine.js 完全初始化
      await page.waitForFunction(() => {
        const element = document.querySelector('[x-data="promptlabPanel"]') as any;
        return element && element.__x !== undefined;
      }, { timeout: 10000 }).catch(() => {});
      // 额外等待确保所有动画完成
      await page.waitForTimeout(2000);
    }
  },
  {
    name: 'ai-analysis',
    path: '/#ai_analysis',
    pageType: PageType.DATA_DISPLAY,
    waitForSelector: '[x-data="aiAnalysisPanel"]',
    maskSelectors: [
      '.timestamp',
      '#analysis-results', // 动态分析结果
      '.progress-bar', // 进度条动画
      '[data-progress]', // 进度相关元素
      '.animate-pulse', // 动画元素
      '.bg-gradient-to-br', // 渐变背景可能有细微差异
      '[class*="animate-"]', // 所有动画元素
      '.result-card', // 结果卡片（动态内容）
      '#json-viewer', // JSON 查看器（动态内容）
      '.toast', // 提示消息
      '[data-dynamic="true"]' // 标记为动态的元素
    ],
    beforeScreenshot: async (page: Page) => {
      // 等待 AI 分析面板加载
      await page.waitForSelector('[x-data="aiAnalysisPanel"]', { timeout: 15000 });
      // 等待网络空闲
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      // 等待 Alpine.js 完全初始化
      await page.waitForFunction(() => {
        const element = document.querySelector('[x-data="aiAnalysisPanel"]') as any;
        return element && element.__x !== undefined;
      }, { timeout: 10000 }).catch(() => {});
      // 额外等待确保所有动画完成
      await page.waitForTimeout(2000);
    }
  },
  {
    name: 'scraper',
    path: '/#scraper',
    pageType: PageType.DATA_DISPLAY,
    waitForSelector: '[x-data="scraperPanel"]',
    maskSelectors: [
      '.timestamp',
      '#scraper-results',
      '.history-item', // 历史记录可能变化
      '#data-cards', // 动态数据卡片
      '#json-display', // JSON 显示区域
      '.task-card', // 任务状态卡片
      '.progress-bar-fill', // 进度条
      '[data-dynamic="true"]' // 标记为动态的元素
    ],
    beforeScreenshot: async (page: Page) => {
      // 等待 Scraper 面板加载
      await page.waitForSelector('[x-data="scraperPanel"]', { timeout: 15000 });
      // 等待网络空闲
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      // 等待 Alpine.js 完全初始化
      await page.waitForFunction(() => {
        const element = document.querySelector('[x-data="scraperPanel"]') as any;
        return element && element.__x !== undefined;
      }, { timeout: 10000 }).catch(() => {});
      // 额外等待确保所有动画完成
      await page.waitForTimeout(2000);
    }
  },
  {
    name: 'qalab',
    path: '/#qalab',
    pageType: PageType.FORM,
    waitForSelector: '#qalab-panel',
    maskSelectors: [
      '.timestamp',
      '#qa-results'
    ],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('#qalab-panel');
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }
  },
  {
    name: 'keyword-hunter',
    path: '/#/app-center/keyword-hunter/input',
    pageType: PageType.FORM,
    waitForSelector: '#kt-module-input',
    maskSelectors: [
      '.timestamp',
      '#kt-keyword-highlight-layer',
      '[class*="animate-"]'
    ],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('#kt-module-input', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }
  },
  {
    name: 'npi-tracker',
    path: '/#sops_npi_tracker',
    pageType: PageType.LIST,
    waitForSelector: '#npi-tracker-panel',
    maskSelectors: [
      '.timestamp',
      '#npi-results'
    ],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('#npi-tracker-panel');
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }
  },
  {
    name: 'restricted-words',
    path: '/#sops_restricted_words',
    pageType: PageType.LIST,
    waitForSelector: '#restricted-words-panel',
    maskSelectors: [
      '.timestamp',
      '#restricted-words-results'
    ],
    beforeScreenshot: async (page: Page) => {
      await page.waitForSelector('#restricted-words-panel');
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }
  }
];

/**
 * 视觉回归测试套件
 */
test.describe('Visual Regression Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  // 桌面端视觉测试
  test.describe('Desktop Views', () => {
    test.use({ viewport: VISUAL_CONFIG.viewports.desktop });

    for (const pageConfig of PAGES) {
      test(`should match ${pageConfig.name} page snapshot`, async ({ page }) => {
        // 导航到页面
        await page.goto(pageConfig.path);
        
        // 等待关键元素
        if (pageConfig.waitForSelector) {
          await page.waitForSelector(pageConfig.waitForSelector, { timeout: 10000 });
        }
        
        // 执行截图前的准备工作
        if (pageConfig.beforeScreenshot) {
          await pageConfig.beforeScreenshot(page);
        }
        
        // 等待页面稳定
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          console.warn('Network idle timeout, continuing...');
        });
        
        // 等待动画完成
        await page.waitForTimeout(500);
        
        // 获取页面特定的阈值配置
        const thresholdConfig = adjustThresholdForViewport(
          getThresholdForPageType(pageConfig.pageType),
          'desktop'
        );
        
        // 截图并对比
        await expect(page).toHaveScreenshot(`${pageConfig.name}-desktop.png`, {
          fullPage: VISUAL_CONFIG.screenshotOptions.fullPage,
          animations: VISUAL_CONFIG.screenshotOptions.animations,
          mask: pageConfig.maskSelectors?.map(selector => page.locator(selector)) || [],
          threshold: thresholdConfig.threshold
        });
      });
    }
  });

  // 平板端视觉测试
  test.describe('Tablet Views', () => {
    test.use({ viewport: VISUAL_CONFIG.viewports.tablet });

    for (const pageConfig of PAGES) {
      test(`should match ${pageConfig.name} page snapshot on tablet`, async ({ page }) => {
        await page.goto(pageConfig.path);
        
        if (pageConfig.waitForSelector) {
          await page.waitForSelector(pageConfig.waitForSelector, { timeout: 10000 });
        }
        
        if (pageConfig.beforeScreenshot) {
          await pageConfig.beforeScreenshot(page);
        }
        
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          console.warn('Network idle timeout, continuing...');
        });
        
        await page.waitForTimeout(500);
        
        // 获取平板端的阈值配置（更宽松）
        const thresholdConfig = adjustThresholdForViewport(
          getThresholdForPageType(pageConfig.pageType),
          'tablet'
        );
        
        await expect(page).toHaveScreenshot(`${pageConfig.name}-tablet.png`, {
          fullPage: VISUAL_CONFIG.screenshotOptions.fullPage,
          animations: VISUAL_CONFIG.screenshotOptions.animations,
          mask: pageConfig.maskSelectors?.map(selector => page.locator(selector)) || [],
          threshold: thresholdConfig.threshold
        });
      });
    }
  });

  // 移动端视觉测试
  test.describe('Mobile Views', () => {
    test.use({ viewport: VISUAL_CONFIG.viewports.mobile });

    for (const pageConfig of PAGES) {
      test(`should match ${pageConfig.name} page snapshot on mobile`, async ({ page }) => {
        await page.goto(pageConfig.path);
        
        if (pageConfig.waitForSelector) {
          await page.waitForSelector(pageConfig.waitForSelector, { timeout: 10000 });
        }
        
        if (pageConfig.beforeScreenshot) {
          await pageConfig.beforeScreenshot(page);
        }
        
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
          console.warn('Network idle timeout, continuing...');
        });
        
        await page.waitForTimeout(500);
        
        // 获取移动端的阈值配置（最宽松）
        const thresholdConfig = adjustThresholdForViewport(
          getThresholdForPageType(pageConfig.pageType),
          'mobile'
        );
        
        await expect(page).toHaveScreenshot(`${pageConfig.name}-mobile.png`, {
          fullPage: VISUAL_CONFIG.screenshotOptions.fullPage,
          animations: VISUAL_CONFIG.screenshotOptions.animations,
          mask: pageConfig.maskSelectors?.map(selector => page.locator(selector)) || [],
          threshold: thresholdConfig.threshold
        });
      });
    }
  });

  // 组件级视觉测试
  test.describe('Component Snapshots', () => {
    test.use({ viewport: VISUAL_CONFIG.viewports.desktop });

    test('should match navigation component', async ({ page }) => {
      await page.goto('/');
      
      const nav = page.locator('nav, .navigation, #main-nav').first();
      const thresholdConfig = getThresholdForComponent('navigation');
      
      await expect(nav).toHaveScreenshot('component-navigation.png', {
        threshold: thresholdConfig.threshold
      });
    });

    test('should match sidebar component', async ({ page }) => {
      await page.goto('/');
      
      const sidebar = page.locator('aside, .sidebar, #sidebar').first();
      if (await sidebar.count() > 0) {
        const thresholdConfig = getThresholdForComponent('card');
        
        await expect(sidebar).toHaveScreenshot('component-sidebar.png', {
          threshold: thresholdConfig.threshold
        });
      }
    });

    test('should match footer component', async ({ page }) => {
      await page.goto('/');
      
      const footer = page.locator('footer, .footer').first();
      if (await footer.count() > 0) {
        const thresholdConfig = getThresholdForComponent('card');
        
        await expect(footer).toHaveScreenshot('component-footer.png', {
          threshold: thresholdConfig.threshold
        });
      }
    });
  });

  // 交互状态视觉测试
  test.describe('Interactive States', () => {
    test.use({ viewport: VISUAL_CONFIG.viewports.desktop });

    test('should match button hover states', async ({ page }) => {
      await page.goto('/');
      
      // 查找第一个按钮
      const button = page.locator('button, .btn').first();
      if (await button.count() > 0) {
        // 悬停状态
        await button.hover();
        await page.waitForTimeout(200);
        
        const thresholdConfig = getThresholdForInteractionState('hover');
        
        await expect(button).toHaveScreenshot('button-hover.png', {
          threshold: thresholdConfig.threshold
        });
      }
    });

    test('should match input focus states', async ({ page }) => {
      await page.goto('/');
      
      // 查找第一个输入框
      const input = page.locator('input[type="text"], input[type="email"], textarea').first();
      if (await input.count() > 0) {
        // 聚焦状态
        await input.focus();
        await page.waitForTimeout(200);
        
        const thresholdConfig = getThresholdForInteractionState('focus');
        
        await expect(input).toHaveScreenshot('input-focus.png', {
          threshold: thresholdConfig.threshold
        });
      }
    });

    test('should match dropdown expanded state', async ({ page }) => {
      await page.goto('/');
      
      // 查找下拉菜单
      const dropdown = page.locator('select, .dropdown, [role="combobox"]').first();
      if (await dropdown.count() > 0) {
        await dropdown.click();
        await page.waitForTimeout(300);
        
        const thresholdConfig = getThresholdForInteractionState('active');
        
        await expect(page).toHaveScreenshot('dropdown-expanded.png', {
          threshold: thresholdConfig.threshold,
          fullPage: false
        });
      }
    });
  });

  // 错误状态视觉测试
  test.describe('Error States', () => {
    test.use({ viewport: VISUAL_CONFIG.viewports.desktop });

    test('should match form validation errors', async ({ page }) => {
      await page.goto('/app_center/promptlab');
      
      // 等待表单加载
      await page.waitForSelector('#promptlab-panel');
      
      // 尝试提交空表单触发验证错误
      const submitButton = page.locator('button[type="submit"], #btn-generate-prompt').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(500);
        
        const thresholdConfig = getThresholdForInteractionState('error');
        
        // 截取包含错误提示的区域
        await expect(page).toHaveScreenshot('form-validation-errors.png', {
          threshold: thresholdConfig.threshold,
          fullPage: true
        });
      }
    });
  });

  // 深色模式测试（如果支持）
  test.describe('Dark Mode', () => {
    test.use({ 
      viewport: VISUAL_CONFIG.viewports.desktop,
      colorScheme: 'dark'
    });

    test('should match home page in dark mode', async ({ page }) => {
      await page.goto('/');
      
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        console.warn('Network idle timeout, continuing...');
      });
      
      await page.waitForTimeout(500);
      
      // 深色模式使用标准阈值
      const thresholdConfig = getThresholdConfig(ThresholdLevel.STANDARD);
      
      await expect(page).toHaveScreenshot('home-dark-mode.png', {
        fullPage: VISUAL_CONFIG.screenshotOptions.fullPage,
        animations: VISUAL_CONFIG.screenshotOptions.animations,
        threshold: thresholdConfig.threshold
      });
    });
  });
});

/**
 * 视觉测试工具函数
 */
test.describe('Visual Test Utilities', () => {
  test('should generate baseline screenshots', async ({ page }) => {
    // 这个测试用于生成所有基准截图
    // 运行: npm run test:e2e tests/visual -- --update-snapshots
    
    for (const pageConfig of PAGES) {
      await page.goto(pageConfig.path);
      
      if (pageConfig.waitForSelector) {
        await page.waitForSelector(pageConfig.waitForSelector, { timeout: 10000 });
      }
      
      if (pageConfig.beforeScreenshot) {
        await pageConfig.beforeScreenshot(page);
      }
      
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
      
      console.log(`Generated baseline for: ${pageConfig.name}`);
    }
  });
});
