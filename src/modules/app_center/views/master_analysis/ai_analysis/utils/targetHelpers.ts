/**
 * 分析目标辅助函数
 * 用于前端通过 targetId 查找配置信息
 */

import { analysisTargets } from '../config/analysisTargets';
import { AnalysisTarget } from '../types';

/**
 * 通过 targetId 获取目标配置
 */
export function getTargetConfig(targetId: string): AnalysisTarget | undefined {
  return analysisTargets.find(t => t.id === targetId);
}

/**
 * 通过 targetId 获取 icon
 */
export function getTargetIcon(targetId: string): string {
  const target = getTargetConfig(targetId);
  return target?.icon || 'fa-solid fa-circle-question';
}

/**
 * 通过 targetId 获取 color
 */
export function getTargetColor(targetId: string): string {
  const target = getTargetConfig(targetId);
  return target?.color || 'slate';
}

/**
 * 通过 targetId 获取 icon 和 color
 */
export function getTargetStyle(targetId: string): { icon: string; color: string } {
  const target = getTargetConfig(targetId);
  return {
    icon: target?.icon || 'fa-solid fa-circle-question',
    color: target?.color || 'slate',
  };
}
