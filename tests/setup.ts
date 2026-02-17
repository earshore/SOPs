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

// Mock localStorage - 使用真实的Map实现
class LocalStorageMock implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

const localStorageMock = new LocalStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage - 使用真实的Map实现
const sessionStorageMock = new LocalStorageMock();

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
