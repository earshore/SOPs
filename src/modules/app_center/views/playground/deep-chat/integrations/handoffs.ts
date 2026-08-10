import {
  uiHooks,
  registerHandoffUiHooks,
  findConfigModelsEntry,
  parseReasoningEffortValue,
} from '../session/uiHooks';
import {
  createThread,
  getActiveListingPromptContext,
  getActiveThread,
  renderPromptDraftsForActiveThread,
  updateActiveThreadFields,
} from '../session/threadStore';

import {
  clampEffort,
  DEFAULT_REASONING_PREFS,
  normalizeApiPathId,
  resolveModelCapability,
  shouldShowReasoningControls,
  type ReasoningEffortLevel,
} from '@/services/modelCapability';

import { StorageService } from '@/services/storageService';

import { appStore } from '@/stores/useAppStore';
import { HistoryService } from '@/modules/app_center/views/master_analysis/services/historyService';
import { registerListingCopyArtifact } from '@/modules/app_center/artifactEnvelopeService';
import { applyListingCopyToKeywordHunter } from '@/modules/app_center/keywordHunterListingHandoff';
import {
  saveListingCopy,
  type AppCenterListingCopy,
} from '@/modules/app_center/listingCopyService';

import {
  buildSystemPromptFromSkillContexts,
  consumeSkillForDeepChat,
  prefixDraftWithSkillContexts,
  type SkillDeepChatContext,
} from '@/modules/app_center/skillDeepChatHandoff';

import { setWorkspaceContext } from '@/modules/app_center/workspaceContext';

import { chooseWithModal, confirmWithModal } from '../infra/confirmModal';

import { getDeepChatSystemPromptBudgetError } from '../request/budget';

import { getPromptDrafts } from '../composer/promptDrafts';
import { hasListingCopyStart } from '../composer/listingCopySanitize';
import { resolveIncompleteGenerationGuard } from '../composer/pushGuard';

import type { DeepChatMessage, DeepChatSkillContext } from '../types';
import { normalizeTemperature, updateTemperatureTrack } from '../infra/utils';
import eventBus from '@/common/EventBus';
import { APP_EVENTS } from '@/common/constants/eventConstants';
import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui/notifications';

import { sessionState } from '../session/sessionState';

export function consumePendingSkillHandoff(container: HTMLElement): boolean {
  const skillContext = consumeSkillForDeepChat();
  if (!skillContext) {
    return false;
  }
  // 技能页「在 Deep Chat 试用」：默认新建会话，不弹挂载方式选择
  void createThreadFromSkillContext(container, skillContext, { allowAttachChoice: false });
  return true;
}

export function bindSkillHandoffListeners(container: HTMLElement): void {
  const tryConsume = (): void => {
    if (!sessionState.mountedContainer || sessionState.mountedContainer !== container) {
      return;
    }
    if (!document.body.contains(container)) {
      return;
    }
    consumePendingSkillHandoff(container);
  };

  const onRouteChanged = (event: Event): void => {
    const detail = (event as CustomEvent<{ routeId?: string }>).detail;
    if (detail?.routeId !== 'playground_deep_chat') {
      return;
    }
    tryConsume();
  };

  const unsubHandoff = eventBus.on(APP_EVENTS.SKILL_DEEP_CHAT_HANDOFF, tryConsume);
  window.addEventListener(APP_EVENTS.ROUTE_CHANGED, onRouteChanged);
  sessionState.cleanupCallbacks.push(() => {
    unsubHandoff();
    window.removeEventListener(APP_EVENTS.ROUTE_CHANGED, onRouteChanged);
  });
}

/**
 * 挂载技能：skill 全文 → 系统提示词；输入框 Chip 展示挂载。
 * - 技能页「在 Deep Chat 试用」：固定新建会话（allowAttachChoice=false）。
 * - Deep Chat Skill Library「去对话」：当前会话有内容时才询问新建 / 附加（allowAttachChoice=true）。
 * FB2：仅「附加到当前会话」时，若会覆盖已有系统提示词才需确认（新建会话不弹覆盖框）。
 * 注意：发送清空后 hydrate 不会把 Chip 再塞回空输入框。
 */

export async function createThreadFromSkillContext(
  container: HTMLElement,
  skillContext: SkillDeepChatContext,
  options: { allowAttachChoice?: boolean } = {}
): Promise<void> {
  const allowAttachChoice = options.allowAttachChoice === true;
  const activeThread = getActiveThread();
  const canAttachToCurrent =
    allowAttachChoice &&
    Boolean(activeThread) &&
    (activeThread.messages.length > 0 ||
      Boolean(activeThread.skillContexts?.length) ||
      Boolean(activeThread.draftText?.trim()));

  let attachToCurrent = false;
  if (canAttachToCurrent) {
    const choice = await chooseWithModal({
      title: '挂载技能',
      content: `如何挂载技能「${skillContext.skillTitle}」？\n新建会话可保留当前对话不变；附加到当前会话会更新本会话的系统提示词与业务草稿。`,
      primaryLabel: '新建会话',
      secondaryLabel: '附加到当前会话',
      cancelLabel: '取消',
      primaryIsDestructive: false,
    });
    if (choice === 'cancel') {
      showToast('已取消挂载技能', { type: 'warning' });
      return;
    }
    attachToCurrent = choice === 'secondary';
  }

  const skillChip: DeepChatSkillContext = {
    skillId: skillContext.skillId,
    skillTitle: skillContext.skillTitle,
    skillRaw: skillContext.skillRaw,
  };

  if (attachToCurrent) {
    // 仅附加到当前会话时，覆盖已有系统提示词需要确认
    if (!(await confirmOverwriteSystemPromptIfNeeded(container, skillContext))) {
      return;
    }
    showSkillLoadBanner(container, skillContext.skillTitle);
    attachSkillToActiveThread(container, skillContext, skillChip);
    return;
  }

  // 新建会话：草稿前缀技能 Chip 标记，便于输入框立即可见
  const draftWithChip = prefixDraftWithSkillContexts(skillContext.userDraft, [skillChip]);
  showSkillLoadBanner(container, skillContext.skillTitle);
  createThread(container, {
    toastMessage: `已附加技能「${skillContext.skillTitle}」`,
    draftText: draftWithChip,
    skillContexts: [skillChip],
  });

  // 多次重试：uiHooks.replaceChat / shadow 就绪后确保 Chip 水合进输入框。
  // 每次回填都绑定当前线程与初始草稿，绝不覆盖后续编辑或另一个会话。
  uiHooks.scheduleSkillComposerDraftFill(container, skillContext.userDraft, {
    threadId: getActiveThread().id,
    draftText: draftWithChip,
  });
}

/** 附加到当前会话时：若已有非空且不同的系统提示词，确认是否覆盖 */

export async function confirmOverwriteSystemPromptIfNeeded(
  container: HTMLElement,
  skillContext: SkillDeepChatContext
): Promise<boolean> {
  const existingPrompt = getCurrentSessionSystemPrompt(container);
  const nextPrompt = skillContext.skillRaw.trim();
  if (!existingPrompt || existingPrompt === nextPrompt) {
    return true;
  }

  const confirmed = await confirmWithModal(
    '覆盖系统提示词',
    `当前会话已有系统提示词。将技能「${skillContext.skillTitle}」附加到本会话会用技能方法论<strong>覆盖</strong>该内容。<br/><span class="text-xs text-slate-500 mt-1 block">若不想覆盖，可改选「新建会话」。可在右上角 Settings 中查看与编辑系统提示词。</span>`,
    'dc_skill_overwrite_system_prompt',
    '覆盖并附加'
  );
  if (!confirmed) {
    showToast('已取消挂载技能', { type: 'warning' });
    return false;
  }
  return true;
}

/** F2：将技能挂到当前会话（更新 skillContexts / 草稿 / 系统提示） */

export function attachSkillToActiveThread(
  container: HTMLElement,
  skillContext: SkillDeepChatContext,
  skillChip: DeepChatSkillContext
): void {
  const activeThread = getActiveThread();
  const existing = activeThread.skillContexts || [];
  const withoutDup = existing.filter(item => item.skillId !== skillChip.skillId);
  const nextContexts = [...withoutDup, skillChip];
  const baseDraft =
    activeThread.draftText?.trim() || skillContext.userDraft || activeThread.draftText || '';
  // 附加技能时在输入框前缀 Chip。
  const nextDraft = prefixDraftWithSkillContexts(baseDraft, nextContexts);

  updateActiveThreadFields(container, {
    skillContexts: nextContexts,
    draftText: nextDraft,
  });
  applySkillContextsToSession(container);
  uiHooks.scheduleSkillComposerDraftFill(container, baseDraft, {
    threadId: activeThread.id,
    draftText: nextDraft,
  });
  showToast(`已将技能「${skillContext.skillTitle}」附加到当前会话`, {
    type: 'success',
  });
}

export function getCurrentSessionSystemPrompt(container: HTMLElement): string {
  const fromSession = sessionState.sessionSystemPrompt.trim();
  if (fromSession) {
    return fromSession;
  }
  const input = container.querySelector<HTMLTextAreaElement>('#deep-chat-system-prompt');
  return input?.value.trim() || '';
}

/** 挂载技能时的短暂到达提示（FB1）：贴输入框上方 */

export function showSkillLoadBanner(container: HTMLElement, skillTitle: string): void {
  uiHooks.placeSkillComposerChrome(container);
  const banner = uiHooks.findSkillLoadBanner(container);
  const text =
    banner?.querySelector<HTMLElement>('#deep-chat-skill-load-banner-text') ||
    container.querySelector<HTMLElement>('#deep-chat-skill-load-banner-text');
  if (!banner || !text) {
    return;
  }
  text.textContent = `正在载入技能「${skillTitle}」…`;
  banner.hidden = false;
  // 保证在输入框正上方。
  uiHooks.placeSkillLoadBannerAboveComposer(container);
  window.setTimeout(() => {
    if (banner.isConnected) {
      banner.hidden = true;
    }
  }, 2200);
}

export function cloneSkillContexts(contexts: DeepChatSkillContext[]): DeepChatSkillContext[] {
  return contexts.map(context => ({
    skillId: context.skillId,
    skillTitle: context.skillTitle,
    skillRaw: context.skillRaw,
  }));
}

/**
 * 技能上下文 → 会话系统提示词。
 * 有技能：以技能派生为主并写回线程；
 * 无技能：使用线程已持久化的用户 systemPrompt（不含已移除技能的残留全文）。
 */

export function applySkillContextsToSession(container: HTMLElement): void {
  const activeThread = getActiveThread();
  const contexts = activeThread.skillContexts || [];
  const skillPrompt = buildSystemPromptFromSkillContexts(contexts);
  const persisted = (activeThread.systemPrompt || '').trim();
  const systemPrompt = skillPrompt || (contexts.length === 0 ? persisted : '');

  sessionState.sessionSystemPrompt = systemPrompt;
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  if (systemPromptInput) {
    systemPromptInput.value = systemPrompt;
  }

  // 有技能时把派生提示词写回线程，保证切会话/重载可恢复
  if (skillPrompt && skillPrompt !== persisted) {
    updateActiveThreadFields(container, { systemPrompt: skillPrompt });
  }

  warnIfSystemPromptOverBudget(systemPrompt);
}

/** 将当前线程的 temperature / systemPrompt 恢复到会话变量与调试面板 */

export function applyThreadTuningToSession(container: HTMLElement | null): void {
  if (!container) {
    return;
  }
  const thread = getActiveThread();
  sessionState.sessionTemperature =
    typeof thread.temperature === 'number' && Number.isFinite(thread.temperature)
      ? normalizeTemperature(String(thread.temperature))
      : 0.3;

  // 技能优先；否则用线程持久化 systemPrompt
  const skillPrompt = buildSystemPromptFromSkillContexts(thread.skillContexts || []);
  sessionState.sessionSystemPrompt = skillPrompt || (thread.systemPrompt || '').trim();

  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  const temperatureInput = container.querySelector<HTMLInputElement>('#deep-chat-temperature');
  const temperatureValue = container.querySelector<HTMLOutputElement>(
    '#deep-chat-temperature-value'
  );
  if (systemPromptInput) {
    systemPromptInput.value = sessionState.sessionSystemPrompt;
  }
  if (temperatureInput) {
    temperatureInput.value = sessionState.sessionTemperature.toFixed(1);
  }
  if (temperatureValue) {
    temperatureValue.value = sessionState.sessionTemperature.toFixed(1);
  }
  updateTemperatureTrack(temperatureInput);
  syncDeepChatReasoningControlsFromThread(container);
  // 模型选择框同步线程生效模型（Spec-02）：切会话/挂载/重置三场景全覆盖
  uiHooks.syncThreadModelToSession(container);
}

export function resolveSessionReasoningUiState(
  provider: string,
  defaultEnabled?: boolean
): {
  enabled: boolean;
  effort: ReasoningEffortLevel;
} {
  const override = getActiveThread().reasoning;
  const stored = StorageService.getLLMConfig(provider)?.reasoningPrefs;
  return {
    enabled:
      override?.enabled !== undefined
        ? Boolean(override.enabled)
        : (stored?.enabled ?? defaultEnabled ?? false),
    effort: parseReasoningEffortValue(override?.effort ?? stored?.effort ?? 'medium'),
  };
}

/** 档位中文标签：与系统设置页保持同一套文案风格 */
const REASONING_EFFORT_LABELS: Record<ReasoningEffortLevel, string> = {
  low: '低 (low)',
  medium: '中 (medium)',
  high: '高 (high)',
  xhigh: '极高 (xhigh)',
  max: '最高 (max)',
};

/**
 * 模型切换通知文案：'切换至{model} · {effort key|推理关}'。
 * 示例：切换至gpt-5.6-sol · medium / 切换至grok-4.5 · 推理关。
 * 档位用 effort key 原文（与需求示例一致）；关闭或未知时显示「推理关」。
 */
export function buildModelSwitchNotice(
  model: string,
  reasoning: { enabled: boolean; effort?: ReasoningEffortLevel }
): string {
  const effortLabel = reasoning.enabled
    ? (reasoning.effort ?? DEFAULT_REASONING_PREFS.effort)
    : '推理关';
  return `切换至${model} · ${effortLabel}`;
}

/** 按模型能力重建档位选项；列表未变化时不重绘 DOM */
function renderReasoningEffortOptions(
  select: HTMLSelectElement,
  levels: readonly ReasoningEffortLevel[]
): void {
  const current = Array.from(select.options).map(option => option.value);
  if (
    current.length === levels.length &&
    current.every((value, index) => value === levels[index])
  ) {
    return;
  }
  select.textContent = '';
  for (const level of levels) {
    const option = document.createElement('option');
    option.value = level;
    option.textContent = REASONING_EFFORT_LABELS[level];
    select.append(option);
  }
}

/** 按模型能力重建档位选项、并把已存档位就近下调到可选范围内 */
function applyReasoningEffortLevels(
  container: HTMLElement,
  select: HTMLSelectElement | null,
  levels: readonly ReasoningEffortLevel[],
  state: { enabled: boolean; effort: ReasoningEffortLevel }
): void {
  const clamped = clampEffort(state.effort, levels);
  if (select) {
    renderReasoningEffortOptions(select, levels);
    select.value = clamped;
    select.disabled = !state.enabled;
    // Toggle-only models (empty allowlist) hide the effort select entirely.
    if (select.parentElement instanceof HTMLElement) {
      select.parentElement.hidden = levels.length === 0;
    }
  }
  if (clamped === state.effort) {
    return;
  }
  // UI 显示的档位必须与实际会发送的档位一致，否则下次请求会用超纲值
  const prev = getActiveThread().reasoning || {};
  updateActiveThreadFields(container, {
    reasoning: { ...prev, enabled: state.enabled, effort: clamped },
  });
}

/** 按当前线程 + 全局默认同步推理控件（会话切换 / 重置） */

export function syncDeepChatReasoningControlsFromThread(container: HTMLElement): void {
  const reasoningRoot = container.querySelector<HTMLElement>('#deep-chat-reasoning-controls');
  const reasoningEnabled = container.querySelector<HTMLInputElement>(
    '#deep-chat-reasoning-enabled'
  );
  const reasoningEffort = container.querySelector<HTMLSelectElement>('#deep-chat-reasoning-effort');
  const config = sessionState.currentConfig;
  const model = sessionState.selectedModel || config?.model || '';
  if (!reasoningRoot || !config || !model) {
    if (reasoningRoot) {
      reasoningRoot.hidden = true;
    }
    return;
  }

  const apiPath = normalizeApiPathId(
    (config as { apiPath?: unknown }).apiPath ??
      StorageService.getLLMConfig(config.provider)?.apiPath
  );
  const cap = resolveModelCapability({
    provider: config.provider,
    modelId: model,
    modelsEntry: findConfigModelsEntry(config, model),
    preferredSurface: apiPath,
  });
  reasoningRoot.hidden = !shouldShowReasoningControls(cap);

  const state = resolveSessionReasoningUiState(config.provider, cap.defaultEnabled);
  if (reasoningEnabled) {
    reasoningEnabled.checked = state.enabled;
  }
  // 产品档位为 low…max，但 UI 只列当前模型真正能发送的档位
  applyReasoningEffortLevels(
    container,
    reasoningEffort,
    cap.reasoningEfforts.length > 0 ? cap.reasoningEfforts : [],
    state
  );
}

/** 卸载 / 切会话前，把调试面板当前值写回线程 */

export function saveActiveThreadTuning(container: HTMLElement): void {
  const systemPromptInput = container.querySelector<HTMLTextAreaElement>(
    '#deep-chat-system-prompt'
  );
  const temperatureInput = container.querySelector<HTMLInputElement>('#deep-chat-temperature');
  const systemPrompt = (systemPromptInput?.value ?? sessionState.sessionSystemPrompt).trim();
  const temperature = temperatureInput
    ? normalizeTemperature(temperatureInput.value)
    : sessionState.sessionTemperature;
  updateActiveThreadFields(container, {
    systemPrompt: systemPrompt || undefined,
    temperature,
  });
}

/** 挂载技能后若系统提示词超预算，即时预警（不必等到发送） */

export function warnIfSystemPromptOverBudget(systemPrompt: string): void {
  const budgetError = getDeepChatSystemPromptBudgetError(systemPrompt);
  if (!budgetError) {
    return;
  }
  showToast(budgetError, {
    type: 'warning',
    description: '请缩短技能全文或系统提示词后再发送',
  });
}

/** 在 light DOM / shadow 中查找技能 UI 节点 */

function buildListingCopyFromPrompt(
  content: string,
  message: DeepChatMessage | undefined,
  promptContext: NonNullable<ReturnType<typeof getActiveListingPromptContext>>
): AppCenterListingCopy {
  const activeThread = getActiveThread();
  const createdAtMs = Number.isFinite(message?.createdAt) ? Number(message?.createdAt) : Date.now();
  const model = (sessionState.selectedModel || sessionState.currentConfig?.model || '').trim();
  return {
    id: `${activeThread.id}:${createdAtMs}`,
    workItemId: promptContext.workItemId,
    promptId: promptContext.promptId,
    threadId: activeThread.id,
    content,
    seoKeywords: [...promptContext.seoKeywords],
    marketplace: promptContext.marketplace,
    asinOrSku: promptContext.asinOrSku,
    createdAt: new Date().toISOString(),
    ...(model ? { model } : {}),
  };
}

/**
 * 推送拦截判定：返回拒绝原因文案，null 表示可推送。
 * 覆盖：① 生成未完成（status partial/stopped，即使已含 Title 起始行；
 * 失败路径 store 合并消息与 DOM 拆分渲染时由线程最新 AI 消息兜底）；
 * ② 正文不含真实 Listing 起始标记（仅推理 / 空正文报错 / DEEP_CHAT_001 错误文案）。
 */
function resolveKeywordHunterPushBlock(content: string, message?: DeepChatMessage): string | null {
  const latestAi = [...getActiveThread().messages].reverse().find(m => m.role === 'ai');
  const incomplete = resolveIncompleteGenerationGuard(message, latestAi);
  if (incomplete) {
    return '回复生成未完成，无法推送复核';
  }
  if (!hasListingCopyStart(content)) {
    return '当前回复未生成完整产品文案（可能仅推理或请求失败），无法推送复核';
  }
  return null;
}

export async function sendAssistantCopyToKeywordHunter(
  content: string,
  message?: DeepChatMessage
): Promise<void> {
  const promptContext = getActiveListingPromptContext();
  if (!promptContext) {
    showToast('请先在右侧 Prompt 列表选择一个 Listing Prompt', { type: 'warning' });
    return;
  }
  if (promptContext.seoKeywords.length === 0) {
    showToast('当前 Prompt 没有关联 SEO 关键词，请回到 Prompt 生成页面补充', {
      type: 'warning',
    });
    return;
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) return;

  const blockReason = resolveKeywordHunterPushBlock(trimmedContent, message);
  if (blockReason) {
    showToast(blockReason, { type: 'warning' });
    return;
  }

  const copy = buildListingCopyFromPrompt(trimmedContent, message, promptContext);

  try {
    saveListingCopy(copy);
    registerListingCopyArtifact(copy);
    applyListingCopyToKeywordHunter(copy);
    setWorkspaceContext({
      workItemId: copy.workItemId,
      marketplace: copy.marketplace as never,
      asinOrSku: copy.asinOrSku,
      sourceRoute: 'keyword_hunter_input',
    });

    const didNavigate = await navigateToRouteId('keyword_hunter_input');
    showToast(
      didNavigate
        ? `已带入产品文案和 ${copy.seoKeywords.length} 个 SEO 关键词`
        : '产品文案已保存，但无法打开 Keyword Hunter',
      { type: didNavigate ? 'success' : 'warning' }
    );
  } catch (error) {
    console.error('[DeepChat] 推送产品文案失败:', error);
    showToast(error instanceof Error ? error.message : '推送产品文案失败，请重试', {
      type: 'error',
    });
  }
}

export async function deletePromptDraft(container: HTMLElement, promptId: string): Promise<void> {
  const promptDraft = getPromptDrafts().find(item => item.id === promptId);
  if (!promptDraft) {
    renderPromptDraftsForActiveThread(container);
    return;
  }

  const confirmed = await confirmWithModal(
    '删除 Prompt 生成记录',
    '删除后将移除该 Prompt 生成记录，<br/><span class="text-xs text-red-400 mt-1 block">无法恢复</span>',
    'dc_ignore_delete_prompt',
    '删除 Prompt'
  );
  if (!confirmed) {
    return;
  }

  let deletedFromSnapshots = false;
  try {
    deletedFromSnapshots = await HistoryService.deletePromptResultAsync(promptId);
  } catch (error) {
    console.error('[DeepChat] 删除历史快照 Prompt 结果失败:', error);
  }

  if (!deletedFromSnapshots) {
    showToast('删除 Prompt 生成记录失败，请稍后重试', { type: 'error' });
    return;
  }

  appStore.getState().removePromptHistory(promptId);
  renderPromptDraftsForActiveThread(container);
  showToast('已删除 Prompt 生成记录', { type: 'success' });
}

registerHandoffUiHooks({
  applySkillContextsToSession,
  applyThreadTuningToSession,
  cloneSkillContexts,
  saveActiveThreadTuning,
});
