import { StorageService } from '@/services/storageService';

export interface OwnerFieldConfig {
  storageKey: string;
  defaultOwner: string;
  inputId: string;
}

export interface OwnerFieldController {
  normalize(owner: unknown): string;
  restore(): void;
  read(): string;
  save(owner: string): void;
}

export function normalizeOwner(owner: unknown, defaultOwner: string): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : defaultOwner;
}

export function createOwnerField(config: OwnerFieldConfig): OwnerFieldController {
  const normalize = (owner: unknown): string => normalizeOwner(owner, config.defaultOwner);

  return {
    normalize,
    restore() {
      const input = document.getElementById(config.inputId) as HTMLInputElement | null;
      if (!input) {
        return;
      }

      input.value = normalize(StorageService.get<string>(config.storageKey, config.defaultOwner));
    },
    read() {
      const input = document.getElementById(config.inputId) as HTMLInputElement | null;
      return normalize(input?.value);
    },
    save(owner: string) {
      StorageService.set(config.storageKey, normalize(owner));
    },
  };
}
