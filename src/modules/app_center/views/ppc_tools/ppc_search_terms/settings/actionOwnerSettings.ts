import { StorageService } from '@/services/storageService';
import { DEFAULT_ACTION_OWNER, normalizeActionOwner } from '../actions/actionItems';
import { getInput } from './settingsFields';

const ACTION_OWNER_STORAGE_KEY = 'ppc_search_terms_action_owner_v1';
const LEGACY_ACTION_OWNER_STORAGE_KEY = 'ppc_action_owner_v1';

export function restoreActionOwner(container: HTMLElement): void {
  const saved = getStoredActionOwner();
  const input = getInput(container, 'ppc-search-terms-action-owner');
  if (input) input.value = normalizeActionOwner(saved);
}

export function readActionOwner(container: HTMLElement): string {
  return normalizeActionOwner(getInput(container, 'ppc-search-terms-action-owner')?.value);
}

export function saveActionOwner(owner: string): void {
  StorageService.set(ACTION_OWNER_STORAGE_KEY, normalizeActionOwner(owner));
}

function getStoredActionOwner(): string {
  const saved = StorageService.get<string>(ACTION_OWNER_STORAGE_KEY, null);
  if (saved !== null) {
    return saved;
  }

  const legacySaved = StorageService.get<string>(LEGACY_ACTION_OWNER_STORAGE_KEY, null);
  if (legacySaved !== null) {
    StorageService.set(ACTION_OWNER_STORAGE_KEY, legacySaved);
    StorageService.remove(LEGACY_ACTION_OWNER_STORAGE_KEY);
    return legacySaved;
  }

  return DEFAULT_ACTION_OWNER;
}
