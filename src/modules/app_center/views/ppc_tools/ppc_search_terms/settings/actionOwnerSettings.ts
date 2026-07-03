import { StorageService } from '@/services/storageService';
import { DEFAULT_ACTION_OWNER, normalizeActionOwner } from '../actions/actionItems';
import { getInput } from './settingsFields';

const ACTION_OWNER_STORAGE_KEY = 'ppc_action_owner_v1';

export function restoreActionOwner(container: HTMLElement): void {
  const saved = StorageService.get<string>(ACTION_OWNER_STORAGE_KEY, DEFAULT_ACTION_OWNER);
  const input = getInput(container, 'ppc-action-owner');
  if (input) input.value = normalizeActionOwner(saved);
}

export function readActionOwner(container: HTMLElement): string {
  return normalizeActionOwner(getInput(container, 'ppc-action-owner')?.value);
}

export function saveActionOwner(owner: string): void {
  StorageService.set(ACTION_OWNER_STORAGE_KEY, normalizeActionOwner(owner));
}
