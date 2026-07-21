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

/** 从草稿中移除指定技能标题的 Chip 标记（「技能名」与裸标题） */
export function stripSkillMarkersFromDraft(draft: string, titles: ReadonlyArray<string>): string {
  let body = draft || '';
  for (const rawTitle of titles) {
    const title = rawTitle.trim();
    if (!title) continue;
    const segment = formatSkillTitleSegment(title);
    body = body.replace(new RegExp(escapeRegExp(segment), 'g'), '');
    body = body.replace(new RegExp(`(?<!「)${escapeRegExp(title)}(?!」)`, 'g'), '');
  }
  return body
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 将会话技能 Chip 标记置于草稿前部，与业务正文混排。
 * 已含对应「技能名」标记时不重复插入。
 */
export function prefixDraftWithSkillContexts(
  draft: string,
  contexts: ReadonlyArray<{ skillTitle: string }>
): string {
  // 先清掉仍在列表中的技能标记，再统一前缀
  let body = stripSkillMarkersFromDraft(
    draft,
    contexts.map(context => context.skillTitle)
  );

  if (contexts.length === 0) {
    return body;
  }

  const prefix = contexts
    .map(context => formatSkillTitleSegment(context.skillTitle.trim()))
    .filter(Boolean)
    .join('');
  if (!prefix) {
    return normalizeSkillChipDraftText(body, contexts);
  }
  const combined = body ? `${prefix}\n${body}` : prefix;
  return normalizeSkillChipDraftText(combined, contexts);
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

/** 代码块语言：脚本/数据类不当作用户试用提示词 */
const USAGE_EXAMPLE_SKIP_LANG =
  /^(bash|sh|shell|zsh|powershell|ps1|cmd|json|ya?ml|python|py|javascript|js|typescript|ts|html|css|sql|toml|xml)$/i;

function isNaturalLanguageUsageExample(lang: string, body: string): boolean {
  if (!body || body.length < 8) {
    return false;
  }
  if (lang && USAGE_EXAMPLE_SKIP_LANG.test(lang)) {
    return false;
  }
  // 无语言标记的脚本/JSON 示例也跳过
  if (/^(npx |python3? |pip |npm |curl |git |#!|\{[\s\S]*"[\w-]+"\s*:)/m.test(body)) {
    return false;
  }
  return true;
}

/**
 * 从 SKILL.md 抽取「Usage Examples / Usage」中可作为用户草稿的自然语言示例。
 * 优先第一个自然语言代码块；无合适示例时返回 null。
 */
export function extractSkillUsageExamplesDraft(skillRaw: string): string | null {
  const section = extractMarkdownSection(skillRaw, [/^##\s+Usage Examples\b/i, /^##\s+Usage\b/i]);
  if (!section) {
    return null;
  }

  const fencePattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fencePattern.exec(section)) !== null) {
    const lang = (match[1] || '').trim();
    const body = (match[2] || '').trim();
    if (isNaturalLanguageUsageExample(lang, body)) {
      return body.slice(0, 4000);
    }
  }
  return null;
}

/** 截取从匹配标题到下一个同级/更高级标题之间的正文 */
function extractMarkdownSection(raw: string, headingPatterns: RegExp[]): string | null {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] || '';
    if (headingPatterns.some(pattern => pattern.test(line.trim()))) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) {
    return null;
  }

  const body: string[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i] || '';
    if (/^##\s+/.test(line.trim())) {
      break;
    }
    body.push(line);
  }
  return body.join('\n').trim() || null;
}

/**
 * 可编辑业务草稿（不含技能名 Chip）。
 * 优先使用 skill 的 Usage Examples；否则回退通用引导。
 * 技能挂载由会话 Context Bar 展示；系统提示词 = skill 全文。
 */
export function buildSkillDeepChatUserDraft(_skillTitle?: string, skillRaw?: string): string {
  const fromExamples = skillRaw ? extractSkillUsageExamplesDraft(skillRaw) : null;
  if (fromExamples) {
    return fromExamples;
  }
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
