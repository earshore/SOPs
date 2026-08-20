export const ACTION_GLOBAL_NAMES = [
  'switch-tab',
  'renderMegaMenu',
  'showToast',
  'close',
  'openSettings',
  'closeSettings',
  'downloadAmazonInsightPlugin',
  'saveProviderConfig',
  'loadProviderConfig',
  'fetchModels',
  'toggleApiKeyVisibility',
  'testConnection',
  'saveProxyConfig',
  'openPerformanceMonitor',
  'showPerformanceReport',
  'switchTheme',
  'getAllThemes',
  'getCurrentTheme',
  'showLogs',
  'showErrors',
  'clearLogs',
  'downloadLogs',
  'toggle-sop-group',
  'scroll-to-sop-module',
  'scroll-to-hub-module',
  'scroll-to-more-module',
  'updateField',
  'updateDeliveryFee',
  'toggleDecision',
  'openNextStepEditor',
  'saveNextSteps',
  'closeNextStepModal',
  'exportToExcel',
  'copyNpiReviewTemplate',
  'copyListingReviewTemplate',
  'filterByStore',
  'filterByStage',
  'showWordDetail',
  'closeWordDetail',
  'toggleAllModules',
  'selectAllAsins',
  'copyPromptText',
  'translateReport',
  'copyReportMarkdown',
  'exportReport',
  'toggleCardResize',
] as const;

export const ACTION_PREFIXES = {
  keyword_hunter_: 'keyword_hunter',
  mp_: 'master_analysis',
  sops_: 'sops_module',
  amz_: 'amz_hub',
  amzf_: 'amz_hub_features',
  more_: 'more_module',
} as const;

export type ActionNameValidationKind = 'global' | 'prefixed' | 'private' | 'kebab-local';

export interface ActionNameValidationResult {
  valid: boolean;
  kind?: ActionNameValidationKind;
  message?: string;
}

const GLOBAL_ACTIONS = new Set<string>(ACTION_GLOBAL_NAMES);
const ACTION_PREFIX_KEYS = Object.keys(ACTION_PREFIXES);
const CAMEL_ACTION_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const KEBAB_ACTION_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function validateRegistryActionName(actionName: string): ActionNameValidationResult {
  if (GLOBAL_ACTIONS.has(actionName)) {
    return { valid: true, kind: 'global' };
  }

  if (actionName.startsWith('_')) {
    return { valid: true, kind: 'private' };
  }

  const matchingPrefix = ACTION_PREFIX_KEYS.find(prefix => actionName.startsWith(prefix));
  if (!matchingPrefix) {
    return {
      valid: false,
      message: `Action "${actionName}" must be a global action or use one of: ${ACTION_PREFIX_KEYS.join(', ')}`,
    };
  }

  const suffix = actionName.slice(matchingPrefix.length);
  if (!CAMEL_ACTION_PATTERN.test(suffix)) {
    return {
      valid: false,
      message: `Action "${actionName}" suffix after "${matchingPrefix}" must be camelCase`,
    };
  }

  return { valid: true, kind: 'prefixed' };
}

export function validateDataActionName(actionName: string): ActionNameValidationResult {
  const registryResult = validateRegistryActionName(actionName);
  if (registryResult.valid) {
    return registryResult;
  }

  if (KEBAB_ACTION_PATTERN.test(actionName)) {
    return { valid: true, kind: 'kebab-local' };
  }

  return {
    valid: false,
    message: `data-action "${actionName}" must be kebab-case, a global action, or <prefix>_<camelAction>`,
  };
}
