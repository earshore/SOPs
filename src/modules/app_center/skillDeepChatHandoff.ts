/**
 * Skills 页 → Deep Chat 试用交接
 * 将 skill 全文作为系统提示词载入，用户在输入框补充业务数据后发送。
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

export function consumeSkillForDeepChat(): SkillDeepChatContext | null {
  if (!pendingSkillContext) return null;
  const context = cloneContext(pendingSkillContext);
  pendingSkillContext = null;
  return context;
}

export function buildSkillDeepChatUserDraft(skillTitle: string): string {
  return [
    `请根据系统提示词中的 Amazon 技能「${skillTitle}」方法论，结合我补充的业务数据给出可执行分析。`,
    '',
    '业务数据：',
    '（在此粘贴真实数据，如 ASIN、报表摘要、成本等）',
  ].join('\n');
}
