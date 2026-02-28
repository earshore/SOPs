// ================================================================
// 🚀 Lighthouse CI 配置文件
// 用于自动化性能测试和质量门禁
// ================================================================

export default {
  ci: {
    // ============================================================
    // 收集配置 (Collect)
    // ============================================================
    collect: {
      // 启动本地服务器配置
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      
      // 测试的 URL 列表
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/#/app-center/promptlab',
        'http://localhost:4173/#/app-center/ai-analysis',
        'http://localhost:4173/#/app-center/scraper',
      ],
      
      // 每个 URL 运行的次数（用于获取稳定的平均值）
      numberOfRuns: 3,
      
      // Lighthouse 设置
      settings: {
        // 只运行指定的类别
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        
        // 设备类型：desktop 或 mobile
        formFactor: 'desktop',
        
        // 网络节流配置（桌面环境）
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        
        // 屏幕模拟配置
        screenEmulation: {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false,
        },
        
        // 其他设置
        emulatedUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    },
    
    // ============================================================
    // 上传配置 (Upload)
    // ============================================================
    upload: {
      // 目标：临时公共存储（用于本地开发和 CI）
      target: 'temporary-public-storage',
      
      // 或者使用文件系统存储（用于本地测试）
      // target: 'filesystem',
      // outputDir: './.lighthouseci',
      
      // 如果使用 Lighthouse CI Server，配置如下：
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: 'your-build-token',
    },
    
    // ============================================================
    // 断言配置 (Assert)
    // 定义性能预算和质量门禁
    // ============================================================
    assert: {
      // 断言级别：off, warn, error
      // - off: 不进行断言
      // - warn: 失败时警告但不阻止构建
      // - error: 失败时报错并阻止构建
      assertMatrix: [
        {
          // 匹配所有 URL
          matchingUrlPattern: '.*',
          
          // 断言规则
          assertions: {
            // ========================================
            // 分类评分断言
            // ========================================
            'categories:performance': ['warn', { minScore: 0.8 }],
            'categories:accessibility': ['warn', { minScore: 0.9 }],
            'categories:best-practices': ['warn', { minScore: 0.9 }],
            'categories:seo': ['warn', { minScore: 0.9 }],
            
            // ========================================
            // Core Web Vitals 断言
            // ========================================
            
            // First Contentful Paint < 1.5s
            'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
            
            // Largest Contentful Paint < 2.5s
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            
            // Cumulative Layout Shift < 0.1
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
            
            // Total Blocking Time < 300ms (FID 的实验室替代指标)
            'total-blocking-time': ['error', { maxNumericValue: 300 }],
            
            // Speed Index < 3.5s
            'speed-index': ['warn', { maxNumericValue: 3500 }],
            
            // Time to Interactive < 3.5s
            'interactive': ['warn', { maxNumericValue: 3500 }],
            
            // ========================================
            // 资源优化断言
            // ========================================
            
            // 启用文本压缩
            'uses-text-compression': ['warn', { minScore: 0.9 }],
            
            // 使用高效的缓存策略
            'uses-long-cache-ttl': ['warn', { minScore: 0.5 }],
            
            // 优化图片
            'uses-optimized-images': ['warn', { minScore: 0.9 }],
            'modern-image-formats': ['warn', { minScore: 0.9 }],
            'uses-responsive-images': ['warn', { minScore: 0.9 }],
            
            // 移除未使用的代码
            'unused-css-rules': ['warn', { minScore: 0.8 }],
            'unused-javascript': ['warn', { minScore: 0.8 }],
            
            // 减少 JavaScript 执行时间
            'bootup-time': ['warn', { maxNumericValue: 3000 }],
            
            // 减少主线程工作
            'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],
            
            // ========================================
            // 最佳实践断言
            // ========================================
            
            // 使用 HTTPS
            'is-on-https': 'off', // 本地开发环境可能不使用 HTTPS
            
            // 避免控制台错误
            'errors-in-console': ['warn', { maxLength: 0 }],
            
            // 图片宽高比正确
            'image-aspect-ratio': ['warn', { minScore: 0.9 }],
            
            // ========================================
            // 可访问性断言
            // ========================================
            
            // 颜色对比度
            'color-contrast': ['warn', { minScore: 0.9 }],
            
            // 图片 alt 属性
            'image-alt': ['warn', { minScore: 0.9 }],
            
            // 表单标签
            'label': ['warn', { minScore: 0.9 }],
            
            // ARIA 属性
            'aria-valid-attr': ['warn', { minScore: 1.0 }],
            'aria-required-attr': ['warn', { minScore: 1.0 }],
            
            // ========================================
            // SEO 断言
            // ========================================
            
            // meta 描述
            'meta-description': ['warn', { minScore: 1.0 }],
            
            // 文档标题
            'document-title': ['warn', { minScore: 1.0 }],
            
            // 可抓取的链接
            'crawlable-anchors': ['warn', { minScore: 1.0 }],
            
            // 字体大小
            'font-size': ['warn', { minScore: 1.0 }],
          },
        },
        
        // 为特定页面设置不同的断言规则
        {
          matchingUrlPattern: '.*promptlab.*',
          assertions: {
            // Promptlab 页面可能有更多交互，放宽 TBT 限制
            'total-blocking-time': ['warn', { maxNumericValue: 500 }],
          },
        },
        
        {
          matchingUrlPattern: '.*ai-analysis.*',
          assertions: {
            // AI 分析页面可能有更多计算，放宽性能要求
            'categories:performance': ['warn', { minScore: 0.85 }],
            'bootup-time': ['warn', { maxNumericValue: 4000 }],
          },
        },
      ],
      
      // 预设配置（可选）
      // preset: 'lighthouse:recommended',
      
      // 包含通过的断言在报告中
      includePassedAssertions: true,
    },
    
    // ============================================================
    // 服务器配置 (Server)
    // 如果使用 Lighthouse CI Server
    // ============================================================
    server: {
      // 服务器 URL
      // baseUrl: 'https://your-lhci-server.com',
      
      // 构建令牌
      // token: process.env.LHCI_TOKEN,
    },
    
    // ============================================================
    // 向导配置 (Wizard)
    // 用于初始化 Lighthouse CI
    // ============================================================
    wizard: {
      // 向导配置（通常不需要）
    },
  },
};
