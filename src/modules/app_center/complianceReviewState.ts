import { APP_CENTER_COMPLIANCE_CHECKLIST } from './workflowDefinitions';

export type ComplianceReviewStatus = 'pending' | 'confirmed' | 'skipped';
export type ComplianceReviewStates = Record<string, ComplianceReviewStatus>;

export interface ComplianceReviewItemView {
  id: string;
  label: string;
  routeId: string;
  reviewPoint: string;
  status: ComplianceReviewStatus;
}

export interface ComplianceReviewView {
  items: ComplianceReviewItemView[];
  note: string;
  reviewedCount: number;
  totalCount: number;
  complete: boolean;
  nextItem: ComplianceReviewItemView | null;
}

interface ComplianceReviewArtifact {
  metadata?: Record<string, string | number | boolean>;
}

function isReviewStatus(value: unknown): value is ComplianceReviewStatus {
  return value === 'pending' || value === 'confirmed' || value === 'skipped';
}

export function createComplianceReviewStates(
  checklistIds: readonly string[],
  itemStates?: Readonly<Record<string, ComplianceReviewStatus>>,
  completedIds: readonly string[] = []
): ComplianceReviewStates {
  const completed = new Set(completedIds);
  return Object.fromEntries(
    checklistIds.map(id => [
      id,
      isReviewStatus(itemStates?.[id])
        ? itemStates[id]
        : completed.has(id)
          ? 'confirmed'
          : 'pending',
    ])
  );
}

export function parseComplianceReviewStates(value: unknown): ComplianceReviewStates {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, ComplianceReviewStatus] =>
        isReviewStatus(entry[1])
      )
    );
  } catch {
    return {};
  }
}

export function getComplianceReviewView(artifact: ComplianceReviewArtifact): ComplianceReviewView {
  const metadata = artifact.metadata || {};
  const checklistIds =
    typeof metadata.checklistIds === 'string' && metadata.checklistIds
      ? metadata.checklistIds.split(',').filter(Boolean)
      : APP_CENTER_COMPLIANCE_CHECKLIST.map(item => item.id);
  const states = createComplianceReviewStates(
    checklistIds,
    parseComplianceReviewStates(metadata.reviewStates),
    typeof metadata.completedIds === 'string'
      ? metadata.completedIds.split(',').filter(Boolean)
      : []
  );
  const items = checklistIds
    .map(id => APP_CENTER_COMPLIANCE_CHECKLIST.find(item => item.id === id))
    .filter((item): item is (typeof APP_CENTER_COMPLIANCE_CHECKLIST)[number] => Boolean(item))
    .map(item => ({ ...item, status: states[item.id] || 'pending' }));
  const reviewedCount = items.filter(item => item.status !== 'pending').length;
  const nextItem = items.find(item => item.status === 'pending') || null;

  return {
    items,
    note: typeof metadata.note === 'string' ? metadata.note : '',
    reviewedCount,
    totalCount: items.length,
    complete: items.length > 0 && reviewedCount === items.length,
    nextItem,
  };
}
