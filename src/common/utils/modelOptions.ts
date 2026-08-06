// src/common/utils/modelOptions.ts
// ================================================================
// 模型选项纯函数（无 DOM、无 IO、无副作用）。
// getModelId 真身所在：modelSelectService（组件）、toolStrategyService（服务层）、
// settings domain 均从这里取，避免组件与 services 之间的循环依赖
// （modelSelectService → toolStrategyService → 本文件）。
// ================================================================

/** 模型选项的最小结构：string（模型 id）或对象（含 id）。 */
type ModelLike = string | { id: string };

/** 提取模型 id：string 原样返回，对象取 `.id`。 */
export function getModelId(model: ModelLike): string {
  return typeof model === 'string' ? model : model.id;
}
