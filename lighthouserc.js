// lighthouserc.js
// ================================================================
// Lighthouse CI 配置
// 性能预算和质量门禁
// ================================================================

module.exports = {
  ci: {
    collect: {
      // 要测试的URL
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/#/sops',
        'http://localhost:3000/#/app-center'
      ],
      // 启动服务器命令
      startServerCommand: 'npm run preview',
      // 启动超时
      startServerReadyTimeout: 30000,
      // 每个URL运行次数
      numberOfRuns: 3,
      // 设置
      settings: {
        // 使用桌面模拟
        preset: 'desktop',
        // 禁用存储重置(保留缓存)
        disableStorageReset: false,
        // 跳过审计
        skipAudits: [
          'uses-http2',
          'canonical'
        ]
      }
    },
    assert: {
      // 性能预算断言
      assertions: {
        // 性能指标
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['warn', { minScore: 0.90 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.80 }],
        
        // 核心Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        
        // 资源大小
        'total-byte-weight': ['warn', { maxNumericValue: 1500000 }], // 1.5MB
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        
        // JavaScript
        'bootup-time': ['warn', { maxNumericValue: 3000 }],
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }],
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],
        
        // 网络
        'uses-long-cache-ttl': 'off',
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'uses-text-compression': 'warn',
        'uses-responsive-images': 'off'
      }
    },
    upload: {
      // 上传到临时公共存储
      target: 'temporary-public-storage'
    }
  }
};
