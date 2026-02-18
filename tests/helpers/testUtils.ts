// tests/helpers/testUtils.ts
// ================================================================
// 测试工具函数
// 提供常用的测试辅助功能
// ================================================================

import { vi } from 'vitest';

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  return localStorageMock;
}

/**
 * Mock sessionStorage
 */
export function mockSessionStorage() {
  const store: Record<string, string> = {};

  const sessionStorageMock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    })
  };

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
  });

  return sessionStorageMock;
}

/**
 * Mock fetch
 */
export function mockFetch(response: any = { data: 'test' }, status: number = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
    headers: new Headers({
      'content-type': 'application/json'
    })
  });

  global.fetch = fetchMock as any;

  return fetchMock;
}

/**
 * Mock console方法
 */
export function mockConsole() {
  const originalConsole = { ...console };

  const consoleMock = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };

  Object.assign(console, consoleMock);

  return {
    mocks: consoleMock,
    restore: () => Object.assign(console, originalConsole)
  };
}

/**
 * Mock window.location
 */
export function mockLocation(url: string = 'http://localhost:3000') {
  const location = new URL(url);

  Object.defineProperty(window, 'location', {
    value: {
      href: location.href,
      origin: location.origin,
      protocol: location.protocol,
      host: location.host,
      hostname: location.hostname,
      port: location.port,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      reload: vi.fn(),
      replace: vi.fn(),
      assign: vi.fn()
    },
    writable: true
  });

  return window.location;
}

/**
 * Mock window.history
 */
export function mockHistory() {
  const historyMock = {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    length: 0,
    state: null,
    scrollRestoration: 'auto' as ScrollRestoration
  };

  Object.defineProperty(window, 'history', {
    value: historyMock,
    writable: true
  });

  return historyMock;
}

/**
 * 触发DOM事件
 */
export function triggerEvent(element: Element, eventType: string, eventData: any = {}) {
  const event = new Event(eventType, { bubbles: true, cancelable: true });
  Object.assign(event, eventData);
  element.dispatchEvent(event);
}

/**
 * 等待DOM更新
 */
export async function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * 创建测试用的DOM元素
 */
export function createTestElement(tag: string = 'div', attributes: Record<string, string> = {}) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

/**
 * 清理DOM
 */
export function cleanupDOM() {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
}

/**
 * 测量函数执行时间
 */
export async function measureTime<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  return { result, duration };
}

/**
 * 重复执行函数
 */
export async function repeat<T>(fn: () => T | Promise<T>, times: number): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < times; i++) {
    results.push(await fn());
  }
  return results;
}

/**
 * 捕获异步错误
 */
export async function captureError<T>(fn: () => T | Promise<T>): Promise<{ result?: T; error?: Error }> {
  try {
    const result = await fn();
    return { result };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * 验证对象结构
 */
export function assertObjectStructure(obj: any, structure: Record<string, string>): boolean {
  return Object.entries(structure).every(([key, type]) => {
    if (!(key in obj)) return false;
    if (type === 'array') return Array.isArray(obj[key]);
    return typeof obj[key] === type;
  });
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 比较两个对象是否深度相等
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * 创建Spy对象
 */
export function createSpy<T extends Record<string, any>>(obj: T): T & { __spies: Record<keyof T, any> } {
  const spies: any = {};
  const spiedObj: any = {};

  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'function') {
      spies[key] = vi.fn(obj[key]);
      spiedObj[key] = spies[key];
    } else {
      spiedObj[key] = obj[key];
    }
  });

  spiedObj.__spies = spies;
  return spiedObj;
}

/**
 * 重置所有Mock
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  vi.resetAllMocks();
}

/**
 * 创建测试超时
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
}

/**
 * 带超时的Promise
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, createTimeout(ms)]);
}

/**
 * 批量执行测试
 */
export async function runBatch<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  batchSize: number = 10
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item, index) => fn(item, i + index)));
  }
}

/**
 * 创建测试沙箱
 */
export function createSandbox() {
  const mocks: Array<() => void> = [];

  return {
    mock: (fn: () => void) => {
      fn();
      mocks.push(fn);
    },
    restore: () => {
      mocks.forEach(mock => mock());
      mocks.length = 0;
    }
  };
}

/**
 * 验证函数调用顺序
 */
export function verifyCallOrder(...fns: Array<{ mock: { calls: any[] } }>) {
  const calls = fns.flatMap((fn, fnIndex) =>
    fn.mock.calls.map((call, callIndex) => ({
      fnIndex,
      callIndex,
      timestamp: Date.now()
    }))
  );

  return calls.every((call, index) => {
    if (index === 0) return true;
    return call.fnIndex >= calls[index - 1].fnIndex;
  });
}
