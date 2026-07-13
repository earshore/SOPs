import { SystemError } from '@/common/errors/AppError';
import { StorageService } from '@/services/storageService';

export const APP_CENTER_LISTING_COPIES_STORAGE_KEY = 'app_center_listing_copies_v1';

export interface AppCenterListingCopy {
  id: string;
  workItemId: string;
  promptId: string;
  threadId: string;
  content: string;
  seoKeywords: string[];
  marketplace: string;
  asinOrSku: string;
  createdAt: string;
}

function isListingCopy(value: unknown): value is AppCenterListingCopy {
  if (!value || typeof value !== 'object') return false;
  const copy = value as Partial<AppCenterListingCopy>;
  return (
    typeof copy.id === 'string' &&
    typeof copy.workItemId === 'string' &&
    typeof copy.promptId === 'string' &&
    typeof copy.threadId === 'string' &&
    typeof copy.content === 'string' &&
    Array.isArray(copy.seoKeywords) &&
    copy.seoKeywords.every(keyword => typeof keyword === 'string') &&
    typeof copy.createdAt === 'string'
  );
}

function readListingCopies(): AppCenterListingCopy[] {
  const stored = StorageService.get<unknown>(APP_CENTER_LISTING_COPIES_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored.filter(isListingCopy) : [];
}

export function getListingCopyById(id: string): AppCenterListingCopy | null {
  return readListingCopies().find(copy => copy.id === id) || null;
}

export function saveListingCopy(copy: AppCenterListingCopy): AppCenterListingCopy {
  const copies = readListingCopies();
  const saved = StorageService.set(APP_CENTER_LISTING_COPIES_STORAGE_KEY, [
    copy,
    ...copies.filter(item => item.id !== copy.id),
  ]);

  if (!saved) {
    throw new SystemError('保存 Deep Chat 产品文案失败：本地存储空间不足', 'LISTING_COPY_001', {
      module: 'listingCopyService',
      action: 'saveListingCopy',
    });
  }

  return copy;
}
