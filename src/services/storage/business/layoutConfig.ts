// src/services/storage/business/layoutConfig.ts
// ================================================================
// 🎯 布局配置域（按模板 id 的布局读写）
// Level 3 B'：从 storageService.ts 拆分出的布局配置业务方法
// 语义与原始实现保持 1:1
// ================================================================

import { getStorageCore, STORAGE_KEYS } from '../core';

type LayoutItem = { id: string; x: number; y: number; w: number; h: number };

/**
 * 获取布局配置
 */
export function getLayoutConfig(templateId: string): LayoutItem[] {
  return (
    getStorageCore().get<LayoutItem[]>(`${STORAGE_KEYS.LAYOUT_CONFIG_PREFIX}${templateId}`, []) ||
    []
  );
}

/**
 * 保存布局配置
 */
export function setLayoutConfig(templateId: string, layout: LayoutItem[]): void {
  getStorageCore().set(`${STORAGE_KEYS.LAYOUT_CONFIG_PREFIX}${templateId}`, layout);
}
