import eventBus from '@/common/EventBus';
import { StorageService } from '@/services/storageService';
import type { HistoryItem } from '@/types/modules-business';

export const APP_CENTER_WORKSPACE_CONTEXT_STORAGE_KEY = 'app_center_workspace_context_v1';
export const APP_CENTER_WORKSPACE_CONTEXT_CHANGED = 'app-center:workspace-context-changed';

export type AppCenterMarketplace =
  | 'DE'
  | 'FR'
  | 'IT'
  | 'ES'
  | 'NL'
  | 'SE'
  | 'PL'
  | 'BE'
  | 'IE'
  | 'UK'
  | 'US'
  | '';

export interface AppCenterWorkspaceContext {
  workItemId: string | null;
  marketplace: AppCenterMarketplace;
  language: string;
  asinOrSku: string;
  sourceRoute: string;
  updatedAt: string;
}

const EMPTY_WORKSPACE_CONTEXT: AppCenterWorkspaceContext = {
  workItemId: null,
  marketplace: '',
  language: '',
  asinOrSku: '',
  sourceRoute: '',
  updatedAt: '',
};

const SUPPORTED_MARKETPLACES = new Set<AppCenterMarketplace>([
  '',
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'SE',
  'PL',
  'BE',
  'IE',
  'UK',
  'US',
]);

type WorkspaceStringField = 'marketplace' | 'language' | 'asinOrSku' | 'sourceRoute' | 'updatedAt';

const WORKSPACE_STRING_FIELDS: WorkspaceStringField[] = [
  'marketplace',
  'language',
  'asinOrSku',
  'sourceRoute',
  'updatedAt',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeMarketplace(value: unknown): AppCenterMarketplace {
  if (typeof value !== 'string') return '';
  const marketplace = value.trim().toUpperCase() as AppCenterMarketplace;
  return SUPPORTED_MARKETPLACES.has(marketplace) ? marketplace : '';
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeWorkItemId(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized || null;
}

function hasInvalidWorkItemIdField(value: Record<string, unknown>): boolean {
  return (
    value.workItemId !== undefined &&
    value.workItemId !== null &&
    typeof value.workItemId !== 'string'
  );
}

function hasInvalidOptionalStringField(
  value: Record<string, unknown>,
  field: WorkspaceStringField
): boolean {
  return value[field] !== undefined && typeof value[field] !== 'string';
}

function hasInvalidContextField(value: Record<string, unknown>): boolean {
  return (
    hasInvalidWorkItemIdField(value) ||
    WORKSPACE_STRING_FIELDS.some(field => hasInvalidOptionalStringField(value, field))
  );
}

function normalizeContext(value: unknown): AppCenterWorkspaceContext {
  if (!isRecord(value)) {
    return { ...EMPTY_WORKSPACE_CONTEXT };
  }

  if (hasInvalidContextField(value)) {
    return { ...EMPTY_WORKSPACE_CONTEXT };
  }

  return {
    workItemId: normalizeWorkItemId(value.workItemId),
    marketplace: normalizeMarketplace(value.marketplace),
    language: normalizeOptionalString(value.language),
    asinOrSku: normalizeOptionalString(value.asinOrSku),
    sourceRoute: normalizeOptionalString(value.sourceRoute),
    updatedAt: normalizeOptionalString(value.updatedAt),
  };
}

function persistWorkspaceContext(context: AppCenterWorkspaceContext): AppCenterWorkspaceContext {
  StorageService.set(APP_CENTER_WORKSPACE_CONTEXT_STORAGE_KEY, context);
  eventBus.emit(APP_CENTER_WORKSPACE_CONTEXT_CHANGED, context);
  return context;
}

function getHistoryAsinOrSku(historyItem: HistoryItem): string {
  const asins =
    historyItem.asins.length > 0
      ? historyItem.asins
      : historyItem.data.products?.map(product => product.asin) || [];

  return asins.filter(Boolean).join(', ');
}

function getHistoryLanguage(historyItem: HistoryItem): string {
  return (
    historyItem.data.metadata?.language ||
    historyItem.data.products?.find(product => product.language)?.language ||
    ''
  );
}

export function createWorkItemIdFromHistoryItem(historyItem: Pick<HistoryItem, 'id'>): string {
  return `competitor_listing:${String(historyItem.id)}`;
}

export function getWorkspaceContext(): AppCenterWorkspaceContext {
  return normalizeContext(StorageService.get<unknown>(APP_CENTER_WORKSPACE_CONTEXT_STORAGE_KEY));
}

export function setWorkspaceContext(
  updates: Partial<AppCenterWorkspaceContext>
): AppCenterWorkspaceContext {
  const context = normalizeContext({
    ...getWorkspaceContext(),
    ...updates,
    updatedAt: updates.updatedAt || new Date().toISOString(),
  });

  return persistWorkspaceContext(context);
}

export function setWorkspaceContextFromHistoryItem(
  historyItem: HistoryItem,
  sourceRoute: string
): AppCenterWorkspaceContext {
  return setWorkspaceContext({
    workItemId: createWorkItemIdFromHistoryItem(historyItem),
    marketplace: normalizeMarketplace(historyItem.data.metadata?.marketplace || historyItem.site),
    language: getHistoryLanguage(historyItem),
    asinOrSku: getHistoryAsinOrSku(historyItem),
    sourceRoute,
    updatedAt: historyItem.timestamp,
  });
}

export function clearWorkspaceContext(): AppCenterWorkspaceContext {
  return persistWorkspaceContext({ ...EMPTY_WORKSPACE_CONTEXT });
}
