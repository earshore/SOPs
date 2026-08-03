// UT-P2-04..06 — rollback ring buffer, multi-tab notice, quota warning
import { beforeEach, describe, expect, it } from 'vitest';
import { readSettingsTemplate } from './settingsTemplateAssembly';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SETTINGS_ROLLBACK_KEY,
  SETTINGS_ROLLBACK_MAX,
  evaluateExternalStorageChange,
  getSettingsRollbackCount,
  isSettingsStorageKey,
  popSettingsRollbackSnapshot,
  pushSettingsRollbackSnapshot,
  readSettingsRollbackStore,
  undoLastSettingsSave,
  type SettingsRollbackStorage,
} from '@/components/settings/domain/settingsRollback';
import {
  isStorageQuotaWarning,
  STORAGE_USAGE_WARN_RATIO,
} from '@/components/settings/domain/settingsHealth';

function createMemoryStorage(): SettingsRollbackStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe('settingsRollback (P2-3)', () => {
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('UT-P2-04 push caps at N and undo restores previous runtime payload', () => {
    for (let i = 0; i < SETTINGS_ROLLBACK_MAX + 3; i++) {
      const count = pushSettingsRollbackSnapshot(
        'runtime',
        { version: 2, llm: { maxRetries: i } },
        storage,
        1_000 + i
      );
      expect(count).toBeLessThanOrEqual(SETTINGS_ROLLBACK_MAX);
    }

    expect(getSettingsRollbackCount('runtime', storage)).toBe(SETTINGS_ROLLBACK_MAX);

    const store = readSettingsRollbackStore(storage);
    const retries = (store.runtime ?? []).map(
      e => (e.payload as { llm: { maxRetries: number } }).llm.maxRetries
    );
    // Oldest of the last N is maxRetries = 3 (pushed 0..7 → keep 3..7)
    expect(retries).toEqual([3, 4, 5, 6, 7]);

    const restored = undoLastSettingsSave('runtime', storage) as {
      llm: { maxRetries: number };
    };
    expect(restored.llm.maxRetries).toBe(7);
    expect(getSettingsRollbackCount('runtime', storage)).toBe(SETTINGS_ROLLBACK_MAX - 1);

    const previous = popSettingsRollbackSnapshot('runtime', storage);
    expect(previous?.payload).toEqual({ version: 2, llm: { maxRetries: 6 } });
  });

  it('UT-P2-04b undo returns null when empty', () => {
    expect(undoLastSettingsSave('runtime', storage)).toBeNull();
    expect(getSettingsRollbackCount('toolStrategy', storage)).toBe(0);
  });

  it('stores under settings_rollback_v1 key', () => {
    pushSettingsRollbackSnapshot('llm', { provider: 'new_api' }, storage);
    expect(storage.map.has(SETTINGS_ROLLBACK_KEY)).toBe(true);
  });
});

describe('multi-tab storage notice (P2-4)', () => {
  it('UT-P2-05 storage event on settings key sets notice; dirty never auto-reloads', () => {
    expect(isSettingsStorageKey('runtime_strategy_settings')).toBe(true);
    expect(isSettingsStorageKey('tool_strategy_settings')).toBe(true);
    expect(isSettingsStorageKey('llm_new_api')).toBe(true);
    expect(isSettingsStorageKey(SETTINGS_ROLLBACK_KEY)).toBe(false);
    expect(isSettingsStorageKey('unrelated_key')).toBe(false);

    const dirty = evaluateExternalStorageChange({
      key: 'runtime_strategy_settings',
      isDirty: true,
    });
    expect(dirty).toEqual({
      notice: true,
      autoReload: false,
      conflict: true,
    });

    const clean = evaluateExternalStorageChange({
      key: 'runtime_strategy_settings',
      isDirty: false,
    });
    expect(clean).toEqual({
      notice: true,
      autoReload: false,
      conflict: false,
    });

    // Non-settings key → no notice
    expect(
      evaluateExternalStorageChange({ key: 'feature_flags', isDirty: true })
    ).toBeNull();
  });

  it('UT-P2-05b panel handleStorageEvent sets flags without reload', async () => {
    // Contract: systemSettings wires storage listener → externalChangeNotice
    const src = readFileSync(
      resolve(process.cwd(), 'src/components/settings/systemSettings.ts'),
      'utf8'
    );
    expect(src).toContain("window.addEventListener('storage'");
    expect(src).toContain('handleStorageEvent');
    const diagnosticsSrc = readFileSync(
      resolve(process.cwd(), 'src/components/settings/sections/diagnosticsSection.ts'),
      'utf8'
    );
    expect(diagnosticsSrc).toContain('externalChangeNotice = true');
    expect(diagnosticsSrc).toContain('externalChangeConflict');
    // handleStorageEvent body must not call reload (only sets flags)
    const handler = diagnosticsSrc.match(
      /handleStorageEvent\(event: StorageEvent\):\s*void\s*\{([\s\S]*?)\n {2}\},/
    )?.[1];
    expect(handler).toBeTruthy();
    expect(handler).toContain('externalChangeNotice = true');
    expect(handler).not.toContain('reloadFromExternalChange');
    expect(handler).not.toContain('loadRuntimeStrategy');
  });
});

describe('quota warning (P2-5)', () => {
  it('UT-P2-06 usage over threshold → warning visible flag', () => {
    expect(STORAGE_USAGE_WARN_RATIO).toBe(0.8);
    expect(isStorageQuotaWarning(undefined)).toBe(false);
    expect(isStorageQuotaWarning(0.79)).toBe(false);
    expect(isStorageQuotaWarning(0.8)).toBe(true);
    expect(isStorageQuotaWarning(0.95)).toBe(true);
    expect(isStorageQuotaWarning(Number.NaN)).toBe(false);
  });

  it('UT-P2-06b template exposes quota status bar', () => {
    const template = readSettingsTemplate();
    expect(template).toContain('data-testid="settings-quota-warning"');
    expect(template).toContain('quotaWarningVisible');
    expect(template).toContain('settings-status-bar--warning');
    expect(template).toContain('data-testid="settings-external-change-notice"');
    expect(template).toContain('data-testid="settings-undo-runtime-save"');
  });
});
