/**
 * 推送拦截守卫：综合「按钮所在气泡匹配到的 store 消息」与「线程最新 AI 消息」判定生成是否未完成。
 *
 * 背景：失败保留路径（pendingRuntime.saveFailedDeepChatResponse）把「部分正文 + 错误文案」
 * 合并存为**一条** store 消息（status=partial），但 deep-chat 渲染时是**两条**独立气泡
 * （partial 正文气泡 + 错误文案气泡）。toolbar 按文本精确匹配 store 消息（findStoredMessageForToolbar），
 * 此时匹配失败 → 按钮携带的 storedMessage 为 undefined → 仅靠它无法拦截 partial 推送。
 * 兜底：只要线程最新 AI 消息带未完成 status，即使按钮气泡匹配不到 store，也拦截。
 */

export type PushGuardMessageLike = { status?: 'partial' | 'stopped' } | undefined;

/**
 * 返回应触发「生成未完成」拦截的状态，无则 undefined。
 * - stored：按钮气泡匹配到的 store 消息（可能 undefined）
 * - latestAi：线程最新 AI 消息（可能 undefined）
 */
export function resolveIncompleteGenerationGuard(
  stored: PushGuardMessageLike,
  latestAi: PushGuardMessageLike
): 'partial' | 'stopped' | undefined {
  if (stored?.status === 'partial' || stored?.status === 'stopped') {
    return stored.status;
  }
  if (latestAi?.status === 'partial' || latestAi?.status === 'stopped') {
    return latestAi.status;
  }
  return undefined;
}
