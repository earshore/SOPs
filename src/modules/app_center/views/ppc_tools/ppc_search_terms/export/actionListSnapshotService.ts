import { LocalDataStore } from '@/services/localDataStore';
import type { AnalyzedRow, ReportType } from '../types';
import type { FilterType } from '../utils/filters';

const PPC_ACTION_LIST_SNAPSHOTS_KEY = 'user:app-center:ppc-action-list-snapshots:v1';
const MAX_PPC_ACTION_LIST_SNAPSHOTS = 30;

export type PpcActionListReviewStatus = 'pending' | 'confirmed' | 'skipped';

export interface PpcActionListSnapshot {
  schemaVersion: 1;
  id: string;
  reportType: ReportType;
  filter: FilterType;
  owner: string;
  rows: AnalyzedRow[];
  reviewStatus: PpcActionListReviewStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavePpcActionListSnapshotInput {
  id: string;
  reportType: ReportType;
  filter: FilterType;
  owner: string;
  rows: readonly AnalyzedRow[];
  createdAt: string;
}

let pendingResumeSnapshot: PpcActionListSnapshot | null = null;

const REVIEW_STATUSES: readonly PpcActionListReviewStatus[] = ['pending', 'confirmed', 'skipped'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSnapshot(value: unknown): value is PpcActionListSnapshot {
  if (!isRecord(value)) return false;
  const checks = [
    value.schemaVersion === 1,
    typeof value.id === 'string',
    typeof value.reportType === 'string',
    typeof value.filter === 'string',
    typeof value.owner === 'string',
    Array.isArray(value.rows),
    REVIEW_STATUSES.includes(value.reviewStatus as PpcActionListReviewStatus),
    typeof value.note === 'string',
    typeof value.createdAt === 'string',
    typeof value.updatedAt === 'string',
  ];
  return checks.every(Boolean);
}

function cloneSnapshot(snapshot: PpcActionListSnapshot): PpcActionListSnapshot {
  return {
    ...snapshot,
    rows: snapshot.rows.map(row => ({ ...row })),
  };
}

async function readSnapshots(): Promise<PpcActionListSnapshot[]> {
  const stored = await LocalDataStore.get<unknown>(PPC_ACTION_LIST_SNAPSHOTS_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(isSnapshot)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function persistSnapshots(snapshots: PpcActionListSnapshot[]): Promise<boolean> {
  return LocalDataStore.set(
    PPC_ACTION_LIST_SNAPSHOTS_KEY,
    snapshots.slice(0, MAX_PPC_ACTION_LIST_SNAPSHOTS),
    'user-data'
  );
}

export async function savePpcActionListSnapshot(
  input: SavePpcActionListSnapshotInput
): Promise<PpcActionListSnapshot | null> {
  const snapshot: PpcActionListSnapshot = {
    schemaVersion: 1,
    id: input.id,
    reportType: input.reportType,
    filter: input.filter,
    owner: input.owner,
    rows: input.rows.map(row => ({ ...row })),
    reviewStatus: 'pending',
    note: '',
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
  const current = await readSnapshots();
  const saved = await persistSnapshots([
    snapshot,
    ...current.filter(item => item.id !== snapshot.id),
  ]);
  return saved ? cloneSnapshot(snapshot) : null;
}

export async function getPpcActionListSnapshotById(
  id: string
): Promise<PpcActionListSnapshot | null> {
  const snapshot = (await readSnapshots()).find(item => item.id === id);
  return snapshot ? cloneSnapshot(snapshot) : null;
}

export async function updatePpcActionListReview(
  id: string,
  reviewStatus: PpcActionListReviewStatus,
  note: string
): Promise<PpcActionListSnapshot | null> {
  const snapshots = await readSnapshots();
  const current = snapshots.find(item => item.id === id);
  if (!current) return null;

  const updated: PpcActionListSnapshot = {
    ...current,
    reviewStatus,
    note: note.trim(),
    updatedAt: new Date().toISOString(),
  };
  const saved = await persistSnapshots(
    snapshots.map(item => (item.id === updated.id ? updated : item))
  );
  return saved ? cloneSnapshot(updated) : null;
}

export function queuePpcActionListResume(snapshot: PpcActionListSnapshot): void {
  pendingResumeSnapshot = cloneSnapshot(snapshot);
}

export function consumePpcActionListResume(): PpcActionListSnapshot | null {
  const snapshot = pendingResumeSnapshot;
  pendingResumeSnapshot = null;
  return snapshot ? cloneSnapshot(snapshot) : null;
}

export async function clearPpcActionListSnapshots(): Promise<void> {
  pendingResumeSnapshot = null;
  await LocalDataStore.remove(PPC_ACTION_LIST_SNAPSHOTS_KEY);
}
