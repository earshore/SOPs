import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '@/services/storageService';
import { createOwnerField, normalizeOwner } from './ownerField';

vi.mock('@/services/storageService', () => ({
  StorageService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

function appendOwnerInput(value = ''): HTMLInputElement {
  const input = document.createElement('input');
  input.id = 'review-owner';
  input.value = value;
  document.body.replaceChildren(input);
  return input;
}

describe('owner field helpers', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.mocked(StorageService.get).mockReset();
    vi.mocked(StorageService.set).mockReset();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('normalizes blank or non-string owners to the default owner', () => {
    expect(normalizeOwner('  Alice  ', 'Default')).toBe('Alice');
    expect(normalizeOwner('   ', 'Default')).toBe('Default');
    expect(normalizeOwner(null, 'Default')).toBe('Default');
  });

  it('restores persisted owner values into the configured input', () => {
    const input = appendOwnerInput();
    vi.mocked(StorageService.get).mockReturnValue('  Owner A  ');
    const ownerField = createOwnerField({
      storageKey: 'review_owner_v1',
      defaultOwner: 'Default Owner',
      inputId: 'review-owner',
    });

    ownerField.restore();

    expect(StorageService.get).toHaveBeenCalledWith('review_owner_v1', 'Default Owner');
    expect(input.value).toBe('Owner A');
  });

  it('reads and saves normalized owner values', () => {
    appendOwnerInput('  Owner B  ');
    const ownerField = createOwnerField({
      storageKey: 'review_owner_v1',
      defaultOwner: 'Default Owner',
      inputId: 'review-owner',
    });

    expect(ownerField.read()).toBe('Owner B');

    ownerField.save('  Owner C  ');

    expect(StorageService.set).toHaveBeenCalledWith('review_owner_v1', 'Owner C');
  });
});
