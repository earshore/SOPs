import { APP_CENTER_COMPLIANCE_CHECKLIST } from './workflowDefinitions';

export type ComplianceReviewStatus = 'pending' | 'passed' | 'issue_found' | 'not_applicable';
type LegacyComplianceReviewStatus = 'confirmed' | 'skipped';
type ComplianceReviewStatusInput = ComplianceReviewStatus | LegacyComplianceReviewStatus;
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
  issueCount: number;
  notApplicableCount: number;
  complete: boolean;
  hasIssues: boolean;
  nextItem: ComplianceReviewItemView | null;
}

interface ComplianceReviewArtifact {
  metadata?: Record<string, string | number | boolean>;
}

function normalizeReviewStatus(value: unknown): ComplianceReviewStatus | null {
  if (
    value === 'pending' ||
    value === 'passed' ||
    value === 'issue_found' ||
    value === 'not_applicable'
  ) {
    return value;
  }
  if (value === 'confirmed') return 'passed';
  if (value === 'skipped') return 'not_applicable';
  return null;
}

export function createComplianceReviewStates(
  checklistIds: readonly string[],
  itemStates?: Readonly<Record<string, ComplianceReviewStatusInput>>,
  completedIds: readonly string[] = []
): ComplianceReviewStates {
  const completed = new Set(completedIds);
  return Object.fromEntries(
    checklistIds.map(id => {
      const status = normalizeReviewStatus(itemStates?.[id]);
      return [id, status || (completed.has(id) ? 'passed' : 'pending')];
    })
  );
}

export function parseComplianceReviewStates(value: unknown): ComplianceReviewStates {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([id, value]) => {
        const status = normalizeReviewStatus(value);
        return status ? [[id, status]] : [];
      })
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
  const issueCount = items.filter(item => item.status === 'issue_found').length;
  const notApplicableCount = items.filter(item => item.status === 'not_applicable').length;
  const nextItem = items.find(item => item.status === 'pending') || null;

  return {
    items,
    note: typeof metadata.note === 'string' ? metadata.note : '',
    reviewedCount,
    totalCount: items.length,
    issueCount,
    notApplicableCount,
    complete: items.length > 0 && reviewedCount === items.length,
    hasIssues: issueCount > 0,
    nextItem,
  };
}
