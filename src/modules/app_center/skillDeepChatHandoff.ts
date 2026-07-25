/**
 * Skills 页 → Deep Chat 试用交接
 * 将 skill 全文作为系统提示词载入；控制器在输入框中渲染可移除的会话 Chip。
 * 产品规则：技能为单次执行——用户发送后消费挂载（卸系统提示与 skillContexts）。
 */

import { createOneShotHandoffQueue } from '@/common/utils/oneShotHandoff';

export interface SkillDeepChatContext {
  skillId: string;
  skillTitle: string;
  skillRaw: string;
  userDraft: string;
}

function cloneContext(context: SkillDeepChatContext): SkillDeepChatContext {
  return {
    skillId: context.skillId,
    skillTitle: context.skillTitle,
    skillRaw: context.skillRaw,
    userDraft: context.userDraft,
  };
}

const skillHandoff = createOneShotHandoffQueue<SkillDeepChatContext>({
  clone: cloneContext,
});

export function queueSkillForDeepChat(context: SkillDeepChatContext): void {
  skillHandoff.queue(context);
}

/** 非破坏性查看 pending，不消费 */
export function peekSkillForDeepChat(): SkillDeepChatContext | null {
  return skillHandoff.peek();
}

export function consumeSkillForDeepChat(): SkillDeepChatContext | null {
  return skillHandoff.consume();
}

/** 展示用：去掉技能标题首尾装饰性 emoji，Chip / 列表更干净 */
export function displaySkillTitle(skillTitle: string): string {
  const trimmed = (skillTitle || '').trim();
  if (!trimmed) return '';
  const cleaned = trimmed
    .replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u, '')
    .trim();
  return cleaned || trimmed;
}

/** 序列化用：正文中技能名文本段（消息气泡 static Chip 读写） */
export function formatSkillTitleSegment(skillTitle: string): string {
  return `「${skillTitle}」`;
}

type SkillTitleContext = {
  skillId?: string;
  skillTitle: string;
};

function getContextIdentity(context: SkillTitleContext, index: number): string {
  return context.skillId?.trim() || `context-${index}`;
}

function getMatchingContextIds(
  contexts: ReadonlyArray<SkillTitleContext>,
  matches: (contextTitle: string) => boolean
): Set<string> {
  const ids = new Set<string>();
  contexts.forEach((context, index) => {
    const contextTitle = context.skillTitle.trim();
    if (contextTitle && matches(contextTitle)) {
      ids.add(getContextIdentity(context, index));
    }
  });
  return ids;
}

/** 原始「技能名」标记只有在唯一指向一个 Skill 时才可水合。 */
export function isUnambiguousRawSkillTitle(
  title: string,
  contexts: ReadonlyArray<SkillTitleContext>
): boolean {
  return getMatchingContextIds(contexts, contextTitle => contextTitle === title).size === 1;
}

/**
 * 裸标题既可能来自原始标题，也可能来自去 emoji 后的展示标题。
 * 只有二者合计仍唯一时，才允许把它转换成 Skill 标记。
 */
export function isUnambiguousSkillTitleSurface(
  title: string,
  contexts: ReadonlyArray<SkillTitleContext>
): boolean {
  return (
    getMatchingContextIds(
      contexts,
      contextTitle => contextTitle === title || displaySkillTitle(contextTitle) === title
    ).size === 1
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 从草稿中移除指定技能标题的 Chip 标记（「技能名」与裸标题） */
export function stripSkillMarkersFromDraft(
  draft: string,
  titles: ReadonlyArray<string>,
  contexts: ReadonlyArray<SkillTitleContext> = titles.map(skillTitle => ({ skillTitle }))
): string {
  let body = draft || '';
  for (const rawTitle of titles) {
    const title = rawTitle.trim();
    if (!title) continue;
    const segment = formatSkillTitleSegment(title);
    body = body.replace(new RegExp(escapeRegExp(segment), 'g'), '');
    if (isUnambiguousSkillTitleSurface(title, contexts)) {
      body = body.replace(new RegExp(`(^|\\n)${escapeRegExp(title)}(?=\\n|$)`, 'g'), '$1');
    }
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
    contexts.map(context => context.skillTitle),
    contexts
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

type SkillChipMarkerMaps = {
  bareMarkers: Map<string, string>;
  canonicalMarkers: Map<string, string>;
};

function buildSkillChipMarkerMaps(contexts: ReadonlyArray<SkillTitleContext>): SkillChipMarkerMaps {
  const canonicalMarkers = new Map<string, string>();
  const bareMarkers = new Map<string, string>();
  for (const context of contexts) {
    const title = context.skillTitle.trim();
    if (!title) continue;
    const segment = formatSkillTitleSegment(title);
    if (isUnambiguousRawSkillTitle(title, contexts)) {
      canonicalMarkers.set(segment, segment);
    }

    for (const marker of [title, displaySkillTitle(title)]) {
      if (isUnambiguousSkillTitleSurface(marker, contexts)) {
        bareMarkers.set(marker, segment);
      }
    }
  }
  return { bareMarkers, canonicalMarkers };
}

function normalizeCanonicalSkillMarkers(
  text: string,
  canonicalMarkers: Map<string, string>
): string {
  const canonicalPattern = Array.from(canonicalMarkers.keys())
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|');
  if (!canonicalPattern) {
    return text;
  }
  return text.replace(
    new RegExp(`\\n*(${canonicalPattern})\\n*`, 'g'),
    (_match, marker: string) => canonicalMarkers.get(marker) || marker
  );
}

function normalizeLeadingBareSkillMarkers(text: string, bareMarkers: Map<string, string>): string {
  const barePattern = Array.from(bareMarkers.keys())
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|');
  if (!barePattern) {
    return text;
  }

  const leadingBarePattern = new RegExp(`^(?:[\\t ]*\\n)*[\\t ]*(${barePattern})[\\t ]*(?:\\n+|$)`);
  let normalizedPrefix = '';
  let remaining = text;
  let leadingMatch = remaining.match(leadingBarePattern);
  while (leadingMatch) {
    const marker = leadingMatch[1] || '';
    normalizedPrefix += bareMarkers.get(marker) || marker;
    remaining = remaining.slice(leadingMatch[0].length);
    leadingMatch = remaining.match(leadingBarePattern);
  }
  return `${normalizedPrefix}${remaining}`;
}

/**
 * 去掉 Chip 文本段两侧的换行。
 * 浏览器 / deep-chat innerText 会在 contenteditable=false 节点旁注入 \n。
 */
export function normalizeSkillChipDraftText(
  text: string,
  contexts: ReadonlyArray<SkillTitleContext>,
  normalizeLeadingBareTitles = true
): string {
  if (!text || contexts.length === 0) {
    return text;
  }

  const { bareMarkers, canonicalMarkers } = buildSkillChipMarkerMaps(contexts);
  const canonicalText = normalizeCanonicalSkillMarkers(text, canonicalMarkers);
  return normalizeLeadingBareTitles
    ? normalizeLeadingBareSkillMarkers(canonicalText, bareMarkers)
    : canonicalText;
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
 * 可编辑业务草稿；控制器会将已挂载技能渲染为可关闭的输入框 Chip。
 * 优先使用 skill 的 Usage Examples；否则回退通用引导。
 * 系统提示词 = skill 全文。
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
