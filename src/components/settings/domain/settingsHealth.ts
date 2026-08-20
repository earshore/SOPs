// TD-SET-01 Phase 1: shared health helpers moved verbatim to src/common/settings
// (home AI status reuses the same evaluation, which AC-6 forbids importing from
// components/settings/domain). Re-exported here so in-panel callers keep working.
export {
  STORAGE_USAGE_WARN_RATIO,
  evaluateSettingsHealth,
  isRuntimeRawInvalid,
  isStorageQuotaWarning,
  type SettingsHealthResult,
} from '@/common/settings/settingsHealth';
