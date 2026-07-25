// src/components/settings/domain/settingsDirty.ts

export type SettingsDirtyPartition = 'llm' | 'toolStrategy' | 'runtime' | 'proxy' | 'appearance';

export interface SettingsDirtySnapshot {
  llm: string;
  toolStrategy: string;
  runtime: string;
  proxy: string;
  appearance: string;
}

function stable(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function snapshotSettingsPartitions(input: {
  llm: unknown;
  toolStrategy: unknown;
  runtime: unknown;
  proxy: unknown;
  appearance: unknown;
}): SettingsDirtySnapshot {
  return {
    llm: stable(input.llm),
    toolStrategy: stable(input.toolStrategy),
    runtime: stable(input.runtime),
    proxy: stable(input.proxy),
    appearance: stable(input.appearance),
  };
}

export function diffSettingsPartitions(
  baseline: SettingsDirtySnapshot,
  current: SettingsDirtySnapshot
): SettingsDirtyPartition[] {
  const keys: SettingsDirtyPartition[] = ['llm', 'toolStrategy', 'runtime', 'proxy', 'appearance'];
  return keys.filter(key => baseline[key] !== current[key]);
}
