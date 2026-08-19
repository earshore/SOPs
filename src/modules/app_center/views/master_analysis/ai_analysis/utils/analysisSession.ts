/**
 * AI 分析进行中会话（断点续跑）
 * 分析期间每个目标完成后持久化一次，页面刷新/切页后可恢复已完成结果并继续。
 */

import { StorageService } from '@/services/storageService';

import type { FullAnalysisReport } from '../config/analysisReportData';

const SESSION_STORAGE_KEY = 'ai_analysis_in_progress_v1';
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface AnalysisSessionSnapshot {
  version: 1;
  sourceHistoryId?: string;
  sourceAsins: string[];
  sourceDataFingerprint?: string;
  targetIds: string[];
  completedTargetIds: string[];
  report: Partial<FullAnalysisReport> | null;
  startedAt: string;
  updatedAt: string;
}

export function saveAnalysisSession(snapshot: AnalysisSessionSnapshot): void {
  try {
    StorageService.set(SESSION_STORAGE_KEY, snapshot);
  } catch (error) {
    console.warn('[AI分析] 保存断点会话失败:', error);
  }
}

export function loadAnalysisSession(): AnalysisSessionSnapshot | null {
  try {
    const parsed = StorageService.get<Partial<AnalysisSessionSnapshot> | null>(
      SESSION_STORAGE_KEY,
      null
    );
    if (!parsed) return null;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.targetIds) ||
      !Array.isArray(parsed.sourceAsins)
    ) {
      return null;
    }
    const updatedAt = typeof parsed.updatedAt === 'string' ? Date.parse(parsed.updatedAt) : NaN;
    if (Number.isNaN(updatedAt) || Date.now() - updatedAt > SESSION_MAX_AGE_MS) {
      clearAnalysisSession();
      return null;
    }
    return parsed as AnalysisSessionSnapshot;
  } catch {
    return null;
  }
}

export function clearAnalysisSession(): void {
  try {
    StorageService.remove(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getSessionCompletedTargetIds(snapshot: AnalysisSessionSnapshot): string[] {
  return snapshot.targetIds.filter(targetId => snapshot.completedTargetIds.includes(targetId));
}
