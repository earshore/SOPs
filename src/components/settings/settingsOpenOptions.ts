// TD-SET-01 Phase 4: type-only deep-link contract (leaf module, zero imports).
// External consumers (e.g. llmFailureUx) import the type from here instead of
// sections/domain, keeping the dependency direction and cycle audit green.

export type SettingsSectionId =
  | 'settings-section-llm'
  | 'settings-section-tool-strategy'
  | 'settings-section-network'
  | 'settings-section-data'
  | 'settings-section-appearance'
  | 'settings-section-performance';

export interface SettingsOpenOptions {
  sectionId?: SettingsSectionId;
  /** Expand details / highlight card, e.g. 'ppc-thresholds' | 'master-analysis' | 'ppc-analysis-flags' */
  focus?: string;
}
