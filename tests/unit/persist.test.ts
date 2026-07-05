// tests/unit/persist.test.ts
// ================================================================
// Persist中间件单元测试
// ================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { persist, clearPersistedState } from '@/stores/middleware/persist';

  const STORAGE_KEY = 'test-store';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ================================================================
  // 基础持久化功能
  // ================================================================

  describe('基础持久化功能', () => {
    it('应该保存状态到localStorage', () => {
      interface TestState {
        count: number;
        increment: () => void;
      }

      const store = createStore<TestState>()(
        persist(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          }),
          { name: STORAGE_KEY }
        )
      );

      store.getState().increment();

      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.state.count).toBe(1);
    });

    it('应该从localStorage恢复状态', () => {
      // 预先保存状态
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { count: 5 },
          version: 0
        })
      );

      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        persist(
          () => ({
            count: 0
          }),
          { name: STORAGE_KEY }
        )
      );

      expect(store.getState().count).toBe(5);
    });

    it('应该在localStorage为空时使用初始状态', () => {
      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        persist(
          () => ({
            count: 10
          }),
          { name: STORAGE_KEY }
        )
      );

      expect(store.getState().count).toBe(10);
    });
  });

  // ================================================================
  // 部分持久化
  // ================================================================

  describe('部分持久化', () => {
    it('应该只持久化指定的字段', () => {
      interface TestState {
        persistedField: string;
        temporaryField: string;
        update: (persisted: string, temporary: string) => void;
      }

      const store = createStore<TestState>()(
        persist(
          (set) => ({
            persistedField: 'initial',
            temporaryField: 'temp',
            update: (persisted, temporary) =>
              set({ persistedField: persisted, temporaryField: temporary })
          }),
          {
            name: STORAGE_KEY,
            partialize: (state) => ({ persistedField: state.persistedField })
          }
        )
      );

      store.getState().update('saved', 'not-saved');

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);
      
      expect(parsed.state.persistedField).toBe('saved');
      expect(parsed.state.temporaryField).toBeUndefined();
    });

    it('应该恢复部分持久化的状态', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { persistedField: 'restored' },
          version: 0
        })
      );

      interface TestState {
        persistedField: string;
        temporaryField: string;
      }

      const store = createStore<TestState>()(
        persist(
          () => ({
            persistedField: 'initial',
            temporaryField: 'temp'
          }),
          {
            name: STORAGE_KEY,
            partialize: (state) => ({ persistedField: state.persistedField })
          }
        )
      );

      expect(store.getState().persistedField).toBe('restored');
      expect(store.getState().temporaryField).toBe('temp');
    });
  });

  describe('敏感字段拒写', () => {
    it('应该拒绝持久化partialize返回的敏感字段', () => {
      interface TestState {
        publicSetting: string;
        apiKey: string;
        maxTokens: number;
        tokenCount: number;
        nested: {
          accessToken: string;
          keep: string;
          userProductProfile: {
            keywordsTier1: string;
          };
        };
        update: () => void;
      }

      const store = createStore<TestState>()(
        persist(
          (set) => ({
            publicSetting: 'initial',
            apiKey: 'initial-secret',
            maxTokens: 1000,
            tokenCount: 10,
            nested: {
              accessToken: 'initial-token',
              keep: 'initial-keep',
              userProductProfile: {
                keywordsTier1: 'initial-keyword'
              }
            },
            update: () =>
              set({
                publicSetting: 'saved',
                apiKey: 'secret-key',
                maxTokens: 2000,
                tokenCount: 20,
                nested: {
                  accessToken: 'secret-token',
                  keep: 'safe-value',
                  userProductProfile: {
                    keywordsTier1: 'draft keyword'
                  }
                }
              })
          }),
          {
            name: STORAGE_KEY,
            partialize: (state) => ({
              publicSetting: state.publicSetting,
              apiKey: state.apiKey,
              maxTokens: state.maxTokens,
              tokenCount: state.tokenCount,
              nested: state.nested
            })
          }
        )
      );

      store.getState().update();

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!) as {
        state: {
          publicSetting?: string;
          apiKey?: string;
          maxTokens?: number;
          tokenCount?: number;
          nested?: Record<string, unknown>;
        };
      };

      expect(parsed.state.publicSetting).toBe('saved');
      expect(parsed.state.apiKey).toBeUndefined();
      expect(parsed.state.maxTokens).toBe(2000);
      expect(parsed.state.tokenCount).toBe(20);
      expect(parsed.state.nested).toEqual({ keep: 'safe-value' });
    });

    it('应该在恢复旧持久化状态时丢弃敏感字段', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: {
            publicSetting: 'restored',
            apiKey: 'legacy-secret-key',
            tokenCount: 12,
            nested: {
              accessToken: 'legacy-access-token',
              keep: 'safe-value',
              child: {
                password: 'legacy-password',
                label: 'safe-label'
              }
            }
          },
          version: 0
        })
      );

      interface TestState {
        publicSetting: string;
        apiKey: string;
        tokenCount: number;
        nested: {
          accessToken?: string;
          keep: string;
          child: {
            password?: string;
            label: string;
          };
        };
      }

      const store = createStore<TestState>()(
        persist(
          () => ({
            publicSetting: 'initial',
            apiKey: 'initial-key',
            tokenCount: 0,
            nested: {
              accessToken: 'initial-access-token',
              keep: 'initial-keep',
              child: {
                password: 'initial-password',
                label: 'initial-label'
              }
            }
          }),
          { name: STORAGE_KEY }
        )
      );

      expect(store.getState()).toEqual({
        publicSetting: 'restored',
        apiKey: 'initial-key',
        tokenCount: 12,
        nested: {
          keep: 'safe-value',
          child: {
            label: 'safe-label'
          }
        }
      });

      const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(persisted.state.apiKey).toBeUndefined();
      expect(persisted.state.nested.accessToken).toBeUndefined();
      expect(persisted.state.nested.child.password).toBeUndefined();
    });
  });

  // ================================================================
  // 版本迁移
  // ================================================================

  describe('版本迁移', () => {
    it('应该在版本不匹配时执行迁移', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { oldField: 'old-value' },
          version: 0
        })
      );

      interface TestState {
        newField: string;
      }

      const migrate = vi.fn((persistedState: any) => ({
        newField: persistedState.oldField
      }));

      const store = createStore<TestState>()(
        persist(
          () => ({
            newField: 'default'
          }),
          {
            name: STORAGE_KEY,
            version: 1,
            migrate
          }
        )
      );

      expect(migrate).toHaveBeenCalled();
      expect(store.getState().newField).toBe('old-value');
    });

    it('应该在版本匹配时跳过迁移', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { field: 'value' },
          version: 1
        })
      );

      interface TestState {
        field: string;
      }

      const migrate = vi.fn();

      createStore<TestState>()(
        persist(
          () => ({
            field: 'default'
          }),
          {
            name: STORAGE_KEY,
            version: 1,
            migrate
          }
        )
      );

      expect(migrate).not.toHaveBeenCalled();
    });

    it('应该保存新版本号', () => {
      interface TestState {
        count: number;
        increment: () => void;
      }

      const store = createStore<TestState>()(
        persist(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          }),
          {
            name: STORAGE_KEY,
            version: 2
          }
        )
      );

      store.getState().increment();

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);
      
      expect(parsed.version).toBe(2);
    });

    it('应该在迁移后丢弃迁移结果中的敏感字段', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { oldField: 'public-value' },
          version: 0
        })
      );

      interface TestState {
        publicSetting: string;
        apiKey: string;
      }

      const store = createStore<TestState>()(
        persist(
          () => ({
            publicSetting: 'initial',
            apiKey: 'initial-key'
          }),
          {
            name: STORAGE_KEY,
            version: 1,
            migrate: () => ({
              publicSetting: 'migrated',
              apiKey: 'migrated-secret-key'
            })
          }
        )
      );

      expect(store.getState()).toEqual({
        publicSetting: 'migrated',
        apiKey: 'initial-key'
      });
    });
  });

  // ================================================================
  // 自定义合并策略
  // ================================================================

  describe('自定义合并策略', () => {
    it('应该使用自定义合并函数', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { count: 5, name: 'persisted' },
          version: 0
        })
      );

      interface TestState {
        count: number;
        name: string;
        computed: string;
      }

      const customMerge = (persistedState: any, currentState: TestState) => ({
        ...currentState,
        count: persistedState.count * 2, // 自定义逻辑
        name: persistedState.name
      });

      const store = createStore<TestState>()(
        persist(
          () => ({
            count: 0,
            name: 'default',
            computed: 'value'
          }),
          {
            name: STORAGE_KEY,
            merge: customMerge
          }
        )
      );

      expect(store.getState().count).toBe(10); // 5 * 2
      expect(store.getState().name).toBe('persisted');
      expect(store.getState().computed).toBe('value');
    });
  });

  // ================================================================
  // 自定义存储引擎
  // ================================================================

  describe('自定义存储引擎', () => {
    it('应该支持自定义存储引擎', () => {
      const customStorage: Storage = {
        data: {} as Record<string, string>,
        length: 0,
        clear() {
          this.data = {};
          this.length = 0;
        },
        getItem(key: string) {
          return this.data[key] || null;
        },
        setItem(key: string, value: string) {
          this.data[key] = value;
          this.length = Object.keys(this.data).length;
        },
        removeItem(key: string) {
          delete this.data[key];
          this.length = Object.keys(this.data).length;
        },
        key(index: number) {
          return Object.keys(this.data)[index] || null;
        }
      };

      interface TestState {
        value: string;
        setValue: (v: string) => void;
      }

      const store = createStore<TestState>()(
        persist(
          (set) => ({
            value: 'initial',
            setValue: (v) => set({ value: v })
          }),
          {
            name: STORAGE_KEY,
            storage: customStorage
          }
        )
      );

      store.getState().setValue('custom');

      expect(customStorage.getItem(STORAGE_KEY)).not.toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // ================================================================
  // 错误处理
  // ================================================================

  describe('错误处理', () => {
    it('应该处理JSON解析错误', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json');

      interface TestState {
        count: number;
      }

      const store = createStore<TestState>()(
        persist(
          () => ({
            count: 10
          }),
          { name: STORAGE_KEY }
        )
      );

      // 应该使用初始状态
      expect(store.getState().count).toBe(10);
    });

    it('应该处理存储写入错误', () => {
      const mockStorage: Storage = {
        length: 0,
        clear: vi.fn(),
        getItem: vi.fn(() => null),
        key: vi.fn(() => null),
        removeItem: vi.fn(),
        setItem: vi.fn(() => {
          throw new Error('Storage full');
        })
      };

      interface TestState {
        count: number;
        increment: () => void;
      }

      const store = createStore<TestState>()(
        persist(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          }),
          {
            name: STORAGE_KEY,
            storage: mockStorage
          }
        )
      );

      // 不应该抛出错误
      expect(() => {
        store.getState().increment();
      }).not.toThrow();
    });

    it('应该处理迁移函数错误', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: { field: 'value' },
          version: 0
        })
      );

      interface TestState {
        field: string;
      }

      const faultyMigrate = () => {
        throw new Error('Migration failed');
      };

      const store = createStore<TestState>()(
        persist(
          () => ({
            field: 'default'
          }),
          {
            name: STORAGE_KEY,
            version: 1,
            migrate: faultyMigrate
          }
        )
      );

      // 应该使用初始状态
      expect(store.getState().field).toBe('default');
    });
  });

  // ================================================================
  // 清除持久化数据
  // ================================================================

  describe('清除持久化数据', () => {
    it('应该清除指定的持久化数据', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: {}, version: 0 }));
      
      clearPersistedState(STORAGE_KEY);
      
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('应该支持自定义存储引擎', () => {
      const customStorage: Storage = {
        data: { [STORAGE_KEY]: 'data' } as Record<string, string>,
        length: 1,
        clear() {
          this.data = {};
          this.length = 0;
        },
        getItem(key: string) {
          return this.data[key] || null;
        },
        setItem(key: string, value: string) {
          this.data[key] = value;
          this.length = Object.keys(this.data).length;
        },
        removeItem(key: string) {
          delete this.data[key];
          this.length = Object.keys(this.data).length;
        },
        key(index: number) {
          return Object.keys(this.data)[index] || null;
        }
      };

      clearPersistedState(STORAGE_KEY, customStorage);
      
      expect(customStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // ================================================================
  // 边界条件
  // ================================================================

  describe('边界条件', () => {
    it('应该处理空状态', () => {
      interface TestState {
        data?: any;
      }

      const store = createStore<TestState>()(
        persist(
          () => ({}),
          { name: STORAGE_KEY }
        )
      );

      expect(store.getState()).toEqual({});
    });

    it('应该处理复杂嵌套对象', () => {
      interface TestState {
        nested: {
          deep: {
            value: number;
          };
        };
        update: (v: number) => void;
      }

      const store = createStore<TestState>()(
        persist(
          (set) => ({
            nested: { deep: { value: 0 } },
            update: (v) => set((state) => ({
              nested: { deep: { value: v } }
            }))
          }),
          { name: STORAGE_KEY }
        )
      );

      store.getState().update(42);

      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(saved!);
      
      expect(parsed.state.nested.deep.value).toBe(42);
    });

    it('应该处理undefined和null值', () => {
      interface TestState {
        nullValue: null;
        undefinedValue?: undefined;
        setValue: (v: null) => void;
      }

      const store = createStore<TestState>()(
        persist(
          (set) => ({
            nullValue: null,
            undefinedValue: undefined,
            setValue: (v) => set({ nullValue: v })
          }),
          { name: STORAGE_KEY }
        )
      );

      store.getState().setValue(null);

      const saved = localStorage.getItem(STORAGE_KEY);
      expect(saved).not.toBeNull();
    });
  });
