// tests/setup.js
// ================================================================
// 测试环境全局设置
// ================================================================

import { vi } from 'vitest';

// ========================
// Mock localStorage
// ========================
const localStorageMock = (() => {
  let store = {};
  
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };
})();

global.localStorage = localStorageMock;

// ========================
// Mock fetch
// ========================
global.fetch = vi.fn();

// ========================
// Mock window.location
// ========================
delete window.location;
window.location = {
  hash: '',
  pathname: '/',
  search: '',
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  reload: vi.fn(),
  replace: vi.fn(),
  assign: vi.fn()
};

// ========================
// Mock window.history
// ========================
window.history.pushState = vi.fn();
window.history.replaceState = vi.fn();

// ========================
// Mock console methods (可选，减少测试输出噪音)
// ========================
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn()
// };

// ========================
// 测试工具函数
// ========================

/**
 * 创建测试用的 DOM 容器
 */
export function createTestContainer(id = 'test-container') {
  const container = document.createElement('div');
  container.id = id;
  document.body.appendChild(container);
  return container;
}

/**
 * 清理测试容器
 */
export function cleanupTestContainer(container) {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
}

/**
 * 等待异步操作完成
 */
export function waitFor(callback, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      try {
        const result = callback();
        if (result) {
          resolve(result);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 50);
        }
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error);
        } else {
          setTimeout(check, 50);
        }
      }
    };
    
    check();
  });
}

// ========================
// 每个测试前重置
// ========================
beforeEach(() => {
  // 重置 localStorage
  localStorageMock.clear();
  
  // 重置 fetch mock
  global.fetch.mockReset();
  
  // 重置 location - 只在需要时定义
  if (global.window && (!global.window.location || Object.getOwnPropertyDescriptor(global.window, 'location')?.configurable !== false)) {
    try {
      Object.defineProperty(global.window, 'location', {
        writable: true,
        configurable: true,
        value: {
          href: 'http://localhost/',
          origin: 'http://localhost',
          protocol: 'http:',
          host: 'localhost',
          hostname: 'localhost',
          port: '',
          pathname: '/',
          search: '',
          hash: '',
          reload: vi.fn(),
          replace: vi.fn(),
          assign: vi.fn()
        }
      });
    } catch (e) {
      // location 已经被定义且不可配置，跳过
    }
  }
  
  // 清理 DOM
  document.body.innerHTML = '';
});

// ========================
// 每个测试后清理
// ========================
afterEach(() => {
  // 清理所有定时器
  vi.clearAllTimers();
  
  // 清理所有 mock
  vi.clearAllMocks();
});

console.log('✅ Test environment setup complete');
