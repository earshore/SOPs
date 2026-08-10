import { getActiveListingPromptContext } from '../session/threadStore';

/**
 * 判断当前是否为「Listing 文案工作流」。
 * 复用 threadStore.getActiveListingPromptContext() 的权威判断：
 * 激活线程已挂载 listingPromptContext，或其 promptDraftId 对应 promptType === 'listing'。
 * 也可显式传入已取得的 ListingPromptContext 跳过读取（测试 / 复用场景）。
 */
export function isListingPromptContext(activeContext?: unknown): boolean {
  const ctx = activeContext === undefined ? getActiveListingPromptContext() : activeContext;
  return (
    ctx !== null &&
    typeof ctx === 'object' &&
    typeof (ctx as { promptId?: unknown }).promptId === 'string'
  );
}

/** 正文起始标记（按出现位置取最早命中；含德语 Titel）。 */
const TITLE_START_MARKERS = [
  '1. Title',
  '**Title**',
  '**Titel**',
  'Title:',
  'Titel:',
  'Title：',
  'Titel：',
] as const;

/** 行首编号列表起始，例如 "1. Title" / "1) Titel" / "1、Title"。 */
const LISTING_START_PATTERN = /(?:^|\n)\s*1[.、)．]\s*(?:Title|Titel)/i;

/**
 * 行首 Title / Titel，允许 markdown 标题/加粗包裹。
 * 覆盖：
 * - grok: "Title  \nOrganizer…"
 * - 德语加粗: "**Titel**: Produkt" / "**Titel**\nProdukt"（冒号在 ** 外时 indexOf('Titel:') 会 miss）
 * - 标题行: "# Title" / "## Titel"
 * 词边界避免 "Title-Verifikation" 连字符构词误命中。
 */
const TITLE_LINE_START_PATTERN =
  /(?:^|\n)\s*(?:#{1,6}\s+)?(?:\*{1,2}|_{1,2})?(?:Title|Titel)(?:\*{1,2}|_{1,2})?(?=[\s:：*]|$)/i;

/**
 * Listing 工作流下判断正文是否包含真实文案起始标记（含放宽的行首 Title/Titel 词）。
 * 用于拦截 DEEP_CHAT_001 错误文案 / 仅推理无正文等无价值推送：
 * 正文只要含 "1. Title" / "Title:" / "**Title**" / "**Titel**" 或行首独立词 Title/Titel 即视为已生成正文。
 * 普通聊天（非 Listing 上下文）不调用本函数，由调用方（handoffs）保证。
 */
export function hasListingCopyStart(text: string): boolean {
  if (!text) return false;
  return findCopyStartIndex(text) !== null;
}

/**
 * Strict numbered bullet labels: "2. Bullet 1" / "3) Bullet".
 * Presence of these means the model chose the N. Bullet template — require 5 + description.
 */
const NUMBERED_BULLET_LABEL = /(?:^|\n)\s*\d+[.)、．]\s*Bullet\b/gi;

/**
 * Description section header (EN/DE), allowing markdown wrappers and optional numbering.
 * Covers: "7. Description:", "**Beschreibung**:", "## Product Description"
 */
const DESCRIPTION_SECTION =
  /(?:^|\n)\s*(?:#{1,6}\s+)?(?:\*{1,2}|_{1,2})?(?:\d+[.)、．]\s*)?(?:Description|Beschreibung|Produktbeschreibung|Product\s+Description)(?:\*{1,2}|_{1,2})?\b/i;

/**
 * Loose bullet markers used by real models (not only "N. Bullet"):
 * - "Bullet 1:" / "**Bullet 2**" / "Bullet Point 3"
 * - "N. Bullet …"
 */
const LOOSE_BULLET_LABEL =
  /(?:^|\n)\s*(?:#{1,6}\s+)?(?:\*{1,2}|_{1,2})?(?:\d+[.)、．]\s*)?Bullet(?:\s*Point)?\s*\d*(?:\*{1,2}|_{1,2})?\b/gi;

/** Dash / bullet-list lines (avoid matching markdown bold openers). */
const DASH_BULLET_LINE = /(?:^|\n)\s*(?:[-•▪◦]|\*(?!\*))\s+\S+/g;

/** Free-form body after Title must be non-trivial to count as a real listing. */
const MIN_FREEFORM_LISTING_CHARS = 200;

/**
 * Structural completeness for Listing push.
 *
 * Design notes (false-block fix):
 * - Do NOT treat a lone "1. Title" as full numbered template (models often mix
 *   "1. Title" + free-form / bold bullets / dash lists).
 * - Only when "N. Bullet" labels appear, require 5 bullets + description (catches
 *   mid-template truncation like 40% stream abort).
 * - Otherwise accept: description section, ≥5 loose bullets, or long free-form body.
 */
export function isCompleteListingCopy(text: string): boolean {
  if (!hasListingCopyStart(text)) {
    return false;
  }

  const start = findCopyStartIndex(text) ?? 0;
  const body = text.slice(start).trim();
  if (!body) {
    return false;
  }

  const numberedBulletCount = countMatches(body, NUMBERED_BULLET_LABEL);
  const looseBulletCount = Math.max(
    numberedBulletCount,
    countMatches(body, LOOSE_BULLET_LABEL),
    countMatches(body, DASH_BULLET_LINE)
  );
  const hasDesc = DESCRIPTION_SECTION.test(body);

  // Clear incomplete numbered-Bullet template (started 1–4 bullets, no description yet).
  if (numberedBulletCount >= 1 && numberedBulletCount < 5 && !hasDesc) {
    return false;
  }

  // Full numbered-Bullet template: need 5 labels + description header.
  if (numberedBulletCount >= 5) {
    return hasDesc;
  }

  // Mixed / free-form / markdown-bold styles common in DE listings.
  if (hasDesc) {
    return true;
  }
  if (looseBulletCount >= 5) {
    return true;
  }
  return body.length >= MIN_FREEFORM_LISTING_CHARS;
}

function countMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  return text.match(re)?.length ?? 0;
}

function findCopyStartIndex(text: string): number | null {
  const positions: number[] = [];
  for (const marker of TITLE_START_MARKERS) {
    const index = text.indexOf(marker);
    if (index >= 0) {
      positions.push(index);
    }
  }
  const listMatch = text.match(LISTING_START_PATTERN);
  if (listMatch?.index !== undefined) {
    positions.push(listMatch.index);
  }
  const lineMatch = text.match(TITLE_LINE_START_PATTERN);
  if (lineMatch?.index !== undefined) {
    positions.push(lineMatch.index);
  }
  return positions.length > 0 ? Math.min(...positions) : null;
}

/**
 * 剥离 Listing 生成场景下模型写进正文开头的自我审查/开场说明
 * （实测 deepseek-v4-max 推理 + 长 Listing Prompt 时，正文以
 * "Ich habe die Briefings ... geprüft." 开头，正文才从 "1. Title" 开始）。
 * 只在命中明确的正文起始标记时截取；未命中则原样返回（保守，不误伤普通聊天）。
 */
export function sanitizeListingCopy(text: string): string {
  if (!text) return text;
  const startIndex = findCopyStartIndex(text);
  if (startIndex === null) return text;
  return text.slice(startIndex).replace(/^\s+/, '');
}
