// tests/setup.ts
// ================================================================
// 🎯 Vitest 测试环境设置
// 全局测试配置和 Mock 设置
// ================================================================

import { vi, afterEach } from 'vitest';

// ==================== 全局配置 ====================

// 设置测试超时
vi.setConfig({ testTimeout: 10000 });

// ==================== 浏览器环境 Mock ====================

// Mock localStorage
const localStorageMock = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
  clear: () => {},
  length: 0,
  key: (_index: number) => null,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
  clear: () => {},
  length: 0,
  key: (_index: number) => null,
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// ==================== 全局测试工具 ====================

/**
 * 创建测试用的 Mock 函数
 */
export function createMockFunction<T extends (...args: any[]) => any>(
  implementation?: T
): T {
  return (vi.fn(implementation || (() => undefined)) as unknown as T);
}

/**
 * 创建测试用的 Mock 对象
 */
export function createMockObject<T extends Record<string, any>>(
  methods: Partial<T>
): T {
  return methods as T;
}

/**
 * 等待异步操作完成
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * 等待指定时间
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 控制台输出控制 ====================

// 在测试中抑制不必要的 console 输出
// 可以通过设置环境变量 DEBUG_TESTS=true 来启用
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    // 在测试中保留 error 和 warn
    log: console.log,
    debug: () => {},
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
}

// ==================== 清理函数 ====================

afterEach(() => {
  // 每个测试后清理所有 Mock
  vi.clearAllMocks();
});
