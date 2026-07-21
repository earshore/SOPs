/**
 * Skills 页 → Deep Chat 试用交接
 * 将 skill 全文作为系统提示词载入；会话级挂载由 Context Bar 展示；
 * 输入框草稿仅承载业务数据（不再内嵌会话 Chip）。
 */

export interface SkillDeepChatContext {
  skillId: string;
  skillTitle: string;
  skillRaw: string;
  userDraft: string;
}

let pendingSkillContext: SkillDeepChatContext | null = null;

function cloneContext(context: SkillDeepChatContext): SkillDeepChatContext {
  return {
    skillId: context.skillId,
    skillTitle: context.skillTitle,
    skillRaw: context.skillRaw,
    userDraft: context.userDraft,
  };
}

export function queueSkillForDeepChat(context: SkillDeepChatContext): void {
  pendingSkillContext = cloneContext(context);
}

/** 非破坏性查看 pending，不消费 */
export function peekSkillForDeepChat(): SkillDeepChatContext | null {
  if (!pendingSkillContext) return null;
  return cloneContext(pendingSkillContext);
}

export function consumeSkillForDeepChat(): SkillDeepChatContext | null {
  if (!pendingSkillContext) return null;
  const context = cloneContext(pendingSkillContext);
  pendingSkillContext = null;
  return context;
}

/** 序列化用：正文中技能名文本段（消息气泡 static Chip 读写） */
export function formatSkillTitleSegment(skillTitle: string): string {
  return `「${skillTitle}」`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 去掉 Chip 文本段两侧的换行。
 * 浏览器 / deep-chat innerText 会在 contenteditable=false 节点旁注入 \n。
 */
export function normalizeSkillChipDraftText(
  text: string,
  contexts: ReadonlyArray<{ skillTitle: string }>
): string {
  if (!text || contexts.length === 0) {
    return text;
  }

  let next = text;
  for (const context of contexts) {
    const title = context.skillTitle.trim();
    if (!title) continue;
    const segment = formatSkillTitleSegment(title);
    const titlePattern = escapeRegExp(title);
    const segmentPattern = escapeRegExp(segment);
    next = next.replace(new RegExp(`\\n*${segmentPattern}\\n*`, 'g'), segment);
    next = next.replace(new RegExp(`\\n*(?<!「)${titlePattern}(?!」)\\n*`, 'g'), segment);
  }
  return next;
}

/**
 * 可编辑业务草稿（不含技能名 Chip）。
 * 技能挂载由会话 Context Bar 展示；系统提示词 = skill 全文。
 */
export function buildSkillDeepChatUserDraft(_skillTitle?: string): string {
  return [
    '请根据已挂载的技能方法论，结合我补充的业务数据给出可执行分析。',
    '',
    '业务数据：',
    '（在此粘贴真实数据，如 ASIN、报表摘要、成本等）',
  ].join('\n');
}

export function buildSystemPromptFromSkillContexts(
  contexts: ReadonlyArray<Pick<SkillDeepChatContext, 'skillRaw'>>
): string {
  return contexts
    .map(context => context.skillRaw.trim())
    .filter(Boolean)
    .join('\n\n---\n\n');
}
