// src/components/settings/domain/settingsRollback.ts
// P2-3: ring-buffer snapshots before successful settings saves (N=5 per partition).

export type SettingsRollbackPartition = 'llm' | 'toolStrategy' | 'runtime';

/** sessionStorage / local key — Spec §5.3 P2-3 */
export const SETTINGS_ROLLBACK_KEY = 'settings_rollback_v1';

/** Max snapshots retained per partition */
export const SETTINGS_ROLLBACK_MAX = 5;

export interface SettingsRollbackEntry {
  partition: SettingsRollbackPartition;
  at: number;
  payload: unknown;
}

export type SettingsRollbackStore = Partial<
  Record<SettingsRollbackPartition, SettingsRollbackEntry[]>
>;

export interface SettingsRollbackStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const PARTITIONS: readonly SettingsRollbackPartition[] = [
  'llm',
  'toolStrategy',
  'runtime',
];

function isPartition(value: unknown): value is SettingsRollbackPartition {
  return value === 'llm' || value === 'toolStrategy' || value === 'runtime';
}

function defaultStorage(): SettingsRollbackStorage | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

export function readSettingsRollbackStore(
  storage: SettingsRollbackStorage | null = defaultStorage()
): SettingsRollbackStore {
  if (!storage) return {};
  try {
    const raw = storage.getItem(SETTINGS_ROLLBACK_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: SettingsRollbackStore = {};
    for (const key of PARTITIONS) {
      const list = (parsed as Record<string, unknown>)[key];
      if (!Array.isArray(list)) continue;
      out[key] = list
        .filter(
          (item): item is SettingsRollbackEntry =>
            !!item &&
            typeof item === 'object' &&
            isPartition((item as SettingsRollbackEntry).partition) &&
            typeof (item as SettingsRollbackEntry).at === 'number'
        )
        .slice(-SETTINGS_ROLLBACK_MAX);
    }
    return out;
  } catch {
    return {};
  }
}

export function writeSettingsRollbackStore(
  store: SettingsRollbackStore,
  storage: SettingsRollbackStorage | null = defaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_ROLLBACK_KEY, JSON.stringify(store));
  } catch {
    // Quota / private mode — ignore; undo is best-effort.
  }
}

/**
 * Push a pre-save snapshot for a partition (ring buffer, max N).
 * Call with the *previous* persisted payload before overwriting storage.
 */
export function pushSettingsRollbackSnapshot(
  partition: SettingsRollbackPartition,
  payload: unknown,
  storage: SettingsRollbackStorage | null = defaultStorage(),
  now: number = Date.now()
): number {
  const store = readSettingsRollbackStore(storage);
  const list = [...(store[partition] ?? [])];
  list.push({ partition, at: now, payload });
  const trimmed = list.slice(-SETTINGS_ROLLBACK_MAX);
  store[partition] = trimmed;
  writeSettingsRollbackStore(store, storage);
  return trimmed.length;
}

/** Number of undo snapshots available for a partition (≤ N). */
export function getSettingsRollbackCount(
  partition: SettingsRollbackPartition,
  storage: SettingsRollbackStorage | null = defaultStorage()
): number {
  return readSettingsRollbackStore(storage)[partition]?.length ?? 0;
}

/**
 * Pop and return the last snapshot for a partition (does not re-apply).
 * Returns null when empty.
 */
export function popSettingsRollbackSnapshot(
  partition: SettingsRollbackPartition,
  storage: SettingsRollbackStorage | null = defaultStorage()
): SettingsRollbackEntry | null {
  const store = readSettingsRollbackStore(storage);
  const list = [...(store[partition] ?? [])];
  if (list.length === 0) return null;
  const entry = list.pop()!;
  store[partition] = list;
  writeSettingsRollbackStore(store, storage);
  return entry;
}

/**
 * Undo last successful save for a partition: pop snapshot and return payload.
 * Caller writes payload back to authoritative storage and refreshes UI.
 */
export function undoLastSettingsSave(
  partition: SettingsRollbackPartition,
  storage: SettingsRollbackStorage | null = defaultStorage()
): unknown | null {
  const entry = popSettingsRollbackSnapshot(partition, storage);
  return entry ? entry.payload : null;
}

/** Keys that indicate another tab changed settings-relevant localStorage. */
export function isSettingsStorageKey(key: string | null | undefined): boolean {
  if (!key) return false;
  if (key === SETTINGS_ROLLBACK_KEY) return false;
  if (key === 'settings_ui_preferences_v1') return false;
  if (
    key === 'runtime_strategy_settings' ||
    key === 'tool_strategy_settings' ||
    key === 'llm_active_provider' ||
    key === 'proxy_config' ||
    key === 'scraper_proxy_config' ||
    key === 'proxy_key_map'
  ) {
    return true;
  }
  // LLM provider configs: llm_<provider> (not llm_key_ which is secure storage)
  if (key.startsWith('llm_') && !key.startsWith('llm_key_')) {
    return true;
  }
  return false;
}

/**
 * Pure handler for multi-tab storage events (P2-4).
 * Returns notice state; never reloads — caller decides.
 */
export function evaluateExternalStorageChange(input: {
  key: string | null;
  isDirty: boolean;
}): { notice: boolean; autoReload: false; conflict: boolean } | null {
  if (!isSettingsStorageKey(input.key)) return null;
  return {
    notice: true,
    autoReload: false,
    /** Dirty → conflict (do not auto-reload). Clean → still no auto-reload; user may reload. */
    conflict: input.isDirty,
  };
}
