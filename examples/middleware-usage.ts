// examples/middleware-usage.ts
// ================================================================
// StateManager 中间件使用示例
// ================================================================

import { StateManager } from '../src/common/infrastructure/StateManager';
import {
  createLoggerMiddleware,
  LogLevel,
  createPersistMiddleware,
  restorePersistedState,
  createValidationMiddleware,
  validators,
  createVersionedPersistMiddleware,
  restoreVersionedPersistedState,
  getStorageUsage,
  cleanupExpiredStates
} from '../src/common/infrastructure/middleware';

// ==================== 示例 1: 使用默认中间件 ====================

function example1_DefaultMiddleware() {
  const stateManager = StateManager.getInstance({
    middleware: [
      // 使用默认的日志中间件
      createLoggerMiddleware(),
      
      // 使用默认的持久化中间件
      createPersistMiddleware(),
      
      // 使用默认的验证中间件
      createValidationMiddleware({
        rules: {
          setAnalysisReport: validators.required
        }
      })
    ]
  });

  // 设置状态（会触发所有中间件）
  stateManager.setAnalysisReport({
    marketplace: 'US',
    results: []
  } as any);
}

// ==================== 示例 2: 自定义日志中间件 ====================

function example2_CustomLogger() {
  const stateManager = StateManager.getInstance({
    middleware: [
      createLoggerMiddleware({
        level: LogLevel.DEBUG,
        logPayload: true,
        logState: false,
        prefix: '[MyApp]',
        excludeActions: ['setLoading', 'setScraperProgress'],
        customLogger: (message, data) => {
          // 自定义日志处理（例如发送到远程服务器）
          console.log(`🔍 ${message}`, data);
        }
      })
    ]
  });

  stateManager.setCurrentTab('promptlab');
}

// ==================== 示例 3: 自定义持久化中间件 ====================

function example3_CustomPersist() {
  const stateManager = StateManager.getInstance({
    middleware: [
      createPersistMiddleware({
        key: 'my-custom-state',
        debounceMs: 500,
        excludeActions: ['setLoading', 'setIsScraping'],
        compress: true,
        onError: (error) => {
          console.error('持久化失败:', error);
          // 可以在这里实现降级策略
        }
      })
    ]
  });

  // 恢复之前保存的状态
  const restoredState = restorePersistedState({
    key: 'my-custom-state',
    compress: true
  });

  if (restoredState) {
    stateManager.restoreSnapshot(restoredState);
  }
}

// ==================== 示例 4: 自定义验证中间件 ====================

function example4_CustomValidation() {
  const stateManager = StateManager.getInstance({
    middleware: [
      createValidationMiddleware({
        rules: {
          // 单个验证规则
          setAnalysisReport: (payload) => {
            if (!payload || typeof payload !== 'object') {
              return '分析报告必须是对象';
            }
            if (!payload.marketplace) {
              return '分析报告缺少 marketplace 字段';
            }
            return true;
          },

          // 多个验证规则
          setSelectedAsins: [
            validators.required,
            validators.isArray,
            (payload) => {
              return payload.every((asin: any) => 
                typeof asin === 'string' && /^B[0-9A-Z]{9}$/.test(asin)
              ) || '所有 ASIN 必须符合格式';
            }
          ],

          // 使用内置验证器组合
          setTemperature: validators.all(
            validators.required,
            validators.isNumber,
            validators.inRange(0, 2)
          ),

          // 使用自定义验证器
          setUserProductProfile: validators.all(
            validators.required,
            validators.isObject,
            validators.hasFields('targetMarket', 'keywordsTier1')
          )
        },
        throwOnError: false,
        onValidationError: (action, error) => {
          console.error(`验证失败 [${action}]:`, error);
          // 可以在这里显示用户友好的错误提示
        }
      })
    ]
  });

  try {
    // 这会触发验证
    stateManager.setSelectedAsins(['B08N5WRWNW', 'B07XYZ1234']);
  } catch (error) {
    console.error('状态更新失败:', error);
  }
}

// ==================== 示例 5: 组合多个中间件 ====================

function example5_CombineMiddleware() {
  const stateManager = StateManager.getInstance({
    middleware: [
      // 1. 先验证
      createValidationMiddleware({
        rules: {
          setAnalysisReport: validators.required,
          setSelectedAsins: validators.isArray
        },
        throwOnError: true
      }),

      // 2. 再记录日志
      createLoggerMiddleware({
        level: LogLevel.INFO,
        logPayload: true
      }),

      // 3. 最后持久化
      createPersistMiddleware({
        key: 'app-state',
        debounceMs: 300
      })
    ]
  });

  // 状态更新会依次经过：验证 -> 日志 -> 持久化
  stateManager.setAnalysisReport({
    marketplace: 'US',
    results: []
  } as any);
}

// ==================== 示例 6: 动态添加/移除中间件 ====================

function example6_DynamicMiddleware() {
  const stateManager = StateManager.getInstance();

  // 创建一个自定义中间件
  const performanceMiddleware = (state: any, action: string, payload: any) => {
    const start = performance.now();
    
    // 在下一个事件循环中测量
    setTimeout(() => {
      const duration = performance.now() - start;
      if (duration > 100) {
        console.warn(`⚠️ 操作 ${action} 耗时 ${duration.toFixed(2)}ms`);
      }
    }, 0);
  };

  // 动态添加中间件
  stateManager.use(performanceMiddleware);

  // 执行一些操作
  stateManager.setAnalysisReport({ marketplace: 'US' } as any);

  // 动态移除中间件
  stateManager.removeMiddleware(performanceMiddleware);
}

// ==================== 示例 7: 错误处理中间件 ====================

function example7_ErrorHandling() {
  const errorHandlingMiddleware = (state: any, action: string, payload: any) => {
    try {
      // 检查是否有潜在的问题
      if (action === 'setAnalysisReport' && payload) {
        const reportSize = JSON.stringify(payload).length;
        if (reportSize > 1024 * 1024) { // 1MB
          console.warn('⚠️ 分析报告过大，可能影响性能');
        }
      }
    } catch (error) {
      console.error('中间件执行出错:', error);
    }
  };

  const stateManager = StateManager.getInstance({
    middleware: [errorHandlingMiddleware]
  });
}

// ==================== 示例 8: 审计日志中间件 ====================

function example8_AuditLog() {
  const auditLogs: Array<{
    timestamp: string;
    action: string;
    user?: string;
    payload: any;
  }> = [];

  const auditMiddleware = (state: any, action: string, payload: any) => {
    auditLogs.push({
      timestamp: new Date().toISOString(),
      action,
      user: 'current-user', // 实际项目中从认证系统获取
      payload
    });

    // 定期上传审计日志
    if (auditLogs.length >= 100) {
      console.log('上传审计日志:', auditLogs.length);
      // uploadAuditLogs(auditLogs);
      auditLogs.length = 0;
    }
  };

  const stateManager = StateManager.getInstance({
    middleware: [auditMiddleware]
  });
}

// ==================== 示例 9: 状态变更通知中间件 ====================

function example9_ChangeNotification() {
  const notificationMiddleware = (state: any, action: string, payload: any) => {
    // 某些重要状态变更时发送通知
    const importantActions = [
      'setAnalysisReport',
      'setScrapedData',
      'setUserProductProfile'
    ];

    if (importantActions.includes(action)) {
      // 发送浏览器通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('状态已更新', {
          body: `${action} 操作已完成`,
          icon: '/icon.png'
        });
      }
    }
  };

  const stateManager = StateManager.getInstance({
    middleware: [notificationMiddleware]
  });
}

// ==================== 示例 10: 开发环境专用中间件 ====================

function example10_DevOnly() {
  const devMiddleware = (state: any, action: string, payload: any) => {
    if (process.env.NODE_ENV === 'development') {
      // 开发环境下的额外检查
      console.group(`🔧 [DEV] ${action}`);
      console.log('Payload:', payload);
      console.log('State before:', state);
      console.groupEnd();
    }
  };

  const stateManager = StateManager.getInstance({
    middleware: process.env.NODE_ENV === 'development' 
      ? [devMiddleware] 
      : []
  });
}

// ==================== 导出示例 ====================

export {
  example1_DefaultMiddleware,
  example2_CustomLogger,
  example3_CustomPersist,
  example4_CustomValidation,
  example5_CombineMiddleware,
  example6_DynamicMiddleware,
  example7_ErrorHandling,
  example8_AuditLog,
  example9_ChangeNotification,
  example10_DevOnly
};

// ==================== 示例 11: 带版本管理的持久化 ====================

function example11_VersionedPersist() {
  // 定义状态迁移函数
  const migrations = {
    // 版本 1: 添加新字段
    1: (state: any) => ({
      ...state,
      analysis: {
        ...state.analysis,
        newField: 'default-value'
      }
    }),
    
    // 版本 2: 重命名字段
    2: (state: any) => {
      const { oldField, ...rest } = state.analysis;
      return {
        ...state,
        analysis: {
          ...rest,
          renamedField: oldField
        }
      };
    },
    
    // 版本 3: 数据结构调整
    3: (state: any) => ({
      ...state,
      scraper: {
        ...state.scraper,
        history: state.scraper.history || []
      }
    })
  };

  const currentVersion = 3;

  const stateManager = StateManager.getInstance({
    middleware: [
      createVersionedPersistMiddleware(
        {
          key: 'app-state-v3',
          debounceMs: 500,
          excludeActions: ['setLoading']
        },
        currentVersion,
        migrations
      )
    ]
  });

  // 恢复状态（会自动执行迁移）
  const restoredState = restoreVersionedPersistedState(
    { key: 'app-state-v3' },
    currentVersion,
    migrations
  );

  if (restoredState) {
    console.log('状态已恢复并迁移到最新版本');
    stateManager.restoreSnapshot(restoredState);
  }
}

// ==================== 示例 12: 监控存储使用情况 ====================

function example12_StorageMonitoring() {
  const stateManager = StateManager.getInstance({
    middleware: [
      createPersistMiddleware({
        key: 'app-state',
        onError: (error) => {
          if (error.name === 'QuotaExceededError') {
            // 存储空间不足，执行清理
            const usage = getStorageUsage();
            console.warn('存储空间不足:', {
              used: `${(usage.used / 1024 / 1024).toFixed(2)} MB`,
              total: `${(usage.total / 1024 / 1024).toFixed(2)} MB`,
              percentage: `${usage.percentage.toFixed(2)}%`
            });

            // 清理过期状态
            const cleaned = cleanupExpiredStates(
              7 * 24 * 60 * 60 * 1000, // 7 天
              /^state-manager-/
            );
            
            console.log(`已清理 ${cleaned} 个过期状态`);
          }
        }
      })
    ]
  });

  // 定期检查存储使用情况
  setInterval(() => {
    const usage = getStorageUsage();
    
    if (usage.percentage > 80) {
      console.warn('⚠️ 存储空间使用超过 80%，建议清理');
      cleanupExpiredStates();
    }
  }, 60 * 60 * 1000); // 每小时检查一次
}

// ==================== 示例 13: 智能持久化策略 ====================

function example13_SmartPersist() {
  // 只持久化重要的状态
  const importantActions = [
    'setAnalysisReport',
    'setScrapedData',
    'setUserProductProfile',
    'setSelectedAsins'
  ];

  const stateManager = StateManager.getInstance({
    middleware: [
      createPersistMiddleware({
        key: 'app-state-important',
        includeActions: importantActions, // 白名单模式
        debounceMs: 1000, // 较长的防抖时间
        compress: true, // 启用压缩
        serialize: (state) => {
          // 自定义序列化，只保存必要的数据
          const minimalState = {
            analysis: {
              analysisReport: state.analysis.analysisReport,
              selectedAsins: state.analysis.selectedAsins
            },
            scraper: {
              scrapedData: state.scraper.scrapedData
            },
            promptlab: {
              userProductProfile: state.promptlab.userProductProfile
            }
          };
          return JSON.stringify(minimalState);
        }
      })
    ]
  });
}

// ==================== 示例 14: 多环境持久化配置 ====================

function example14_MultiEnvironment() {
  const env = process.env.NODE_ENV || 'development';

  const persistConfig = {
    development: {
      key: 'dev-state',
      debounceMs: 100, // 开发环境快速保存
      compress: false, // 不压缩，便于调试
      excludeActions: []
    },
    production: {
      key: 'prod-state',
      debounceMs: 1000, // 生产环境减少写入频率
      compress: true, // 压缩以节省空间
      excludeActions: ['setLoading', 'setScraperProgress', 'setIsAnalyzing']
    }
  };

  const config = persistConfig[env as keyof typeof persistConfig] || persistConfig.development;

  const stateManager = StateManager.getInstance({
    middleware: [
      createPersistMiddleware(config)
    ]
  });
}

// ==================== 导出新增示例 ====================

export {
  example11_VersionedPersist,
  example12_StorageMonitoring,
  example13_SmartPersist,
  example14_MultiEnvironment
};
