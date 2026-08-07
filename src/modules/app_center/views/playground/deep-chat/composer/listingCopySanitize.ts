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
const TITLE_START_MARKERS = ['1. Title', '**Title**', 'Title:', 'Titel:'] as const;

/** 行首编号列表起始，例如 "1. Title" / "1) Titel" / "1、Title"。 */
const LISTING_START_PATTERN = /(?:^|\n)\s*1[.、)．]\s*(?:Title|Titel)/i;

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