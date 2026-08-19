/**
 * Deep Chat 全局技能上下文 Chip
 * - dismissible：输入框 / 编辑回填 — hover 显示移除 ×
 * - static：已发送消息气泡 — 仅展示，无 ×
 */

import {
  displaySkillTitle,
  formatSkillTitleSegment,
  isUnambiguousRawSkillTitle,
  normalizeSkillChipDraftText,
} from '@/modules/app_center/skillDeepChatHandoff';

import type { DeepChatSkillContext } from '../types';

export const SKILL_CHIP_CLASS = 'deep-chat-context-chip';
export const SKILL_CHIP_DISMISSIBLE_CLASS = 'deep-chat-context-chip--dismissible';
export const SKILL_CHIP_STATIC_CLASS = 'deep-chat-context-chip--static';

export type SkillChipMode = 'dismissible' | 'static';

type ChipPart = { type: 'text'; value: string } | { type: 'chip'; context: DeepChatSkillContext };

type ChipMatch = {
  index: number;
  length: number;
  context: DeepChatSkillContext;
};

export function createSvgIcon(paths: string[], size = 12, strokeWidth = '2'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', strokeWidth);
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

/** 构建单个 Chip；static 模式不渲染移除按钮 */
export function createSkillContextChip(
  context: Pick<DeepChatSkillContext, 'skillId' | 'skillTitle'>,
  mode: SkillChipMode = 'dismissible'
): HTMLElement {
  const chip = document.createElement('span');
  chip.className = `${SKILL_CHIP_CLASS} ${
    mode === 'dismissible' ? SKILL_CHIP_DISMISSIBLE_CLASS : SKILL_CHIP_STATIC_CLASS
  }`;
  chip.setAttribute('contenteditable', 'false');
  chip.dataset.skillId = context.skillId;
  chip.dataset.skillTitle = context.skillTitle;
  chip.dataset.chipMode = mode;

  const leading = document.createElement('span');
  leading.className = 'deep-chat-context-chip__leading';

  const icon = document.createElement('span');
  icon.className = 'deep-chat-context-chip__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.appendChild(createSvgIcon(['M22 10v6M2 10l10-5 10 5-10 5z', 'M6 12v5c3 3 9 3 12 0v-5']));
  leading.appendChild(icon);

  if (mode === 'dismissible') {
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'deep-chat-context-chip__dismiss';
    dismiss.dataset.action = 'dismiss-skill-context';
    dismiss.dataset.skillId = context.skillId;
    dismiss.setAttribute('aria-label', `移除技能上下文 ${displaySkillTitle(context.skillTitle)}`);
    dismiss.title = '移除';
    // U5：允许键盘 Tab 聚焦移除（配合 :focus-within 显示 ×）
    dismiss.tabIndex = 0;
    dismiss.appendChild(createSvgIcon(['M18 6 6 18M6 6l12 12'], 12, '2.2'));
    leading.appendChild(dismiss);
  }

  const label = document.createElement('span');
  label.className = 'deep-chat-context-chip__label';
  // 展示去掉首尾装饰 emoji；dataset 仍保留完整 skillTitle 供序列化匹配
  label.textContent = displaySkillTitle(context.skillTitle);

  chip.append(leading, label);
  return chip;
}

function getSkillTitleMarkers(
  context: DeepChatSkillContext,
  contexts: DeepChatSkillContext[]
): string[] {
  const title = context.skillTitle.trim();
  if (!title) {
    return [];
  }

  return isUnambiguousRawSkillTitle(title, contexts) ? [formatSkillTitleSegment(title)] : [];
}

function findNextSkillChipMatch(text: string, contexts: DeepChatSkillContext[]): ChipMatch | null {
  let best: ChipMatch | null = null;
  for (const context of contexts) {
    for (const marker of getSkillTitleMarkers(context, contexts)) {
      if (!marker) continue;
      const index = text.indexOf(marker);
      if (index < 0) continue;
      if (!best || index < best.index || (index === best.index && marker.length > best.length)) {
        best = { index, length: marker.length, context };
      }
    }
  }
  return best;
}

export function splitTextIntoChipParts(
  plainText: string,
  contexts: DeepChatSkillContext[]
): ChipPart[] {
  const parts: ChipPart[] = [];
  let remaining = plainText;
  while (remaining.length > 0) {
    const match = findNextSkillChipMatch(remaining, contexts);
    if (!match) {
      parts.push({ type: 'text', value: remaining });
      break;
    }
    if (match.index > 0) {
      parts.push({ type: 'text', value: remaining.slice(0, match.index) });
    }
    parts.push({ type: 'chip', context: match.context });
    remaining = remaining.slice(match.index + match.length);
  }
  return parts;
}

/** 将宿主内 Chip + 文本序列化为纯文本（Chip → 「技能名」） */
export function serializeChipContainingElement(
  root: HTMLElement,
  _contexts: ReadonlyArray<Pick<DeepChatSkillContext, 'skillId' | 'skillTitle'>> = []
): string {
  let result = '';

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || '';
      return;
    }
    if (!(node instanceof HTMLElement)) {
      return;
    }
    if (node.classList.contains(SKILL_CHIP_CLASS)) {
      const title =
        node.dataset.skillTitle ||
        node.querySelector('.deep-chat-context-chip__label')?.textContent ||
        '';
      result += formatSkillTitleSegment(title.trim());
      return;
    }
    if (node.tagName === 'BR') {
      result += '\n';
      return;
    }

    const isBlock = /^(DIV|P|LI)$/i.test(node.tagName);
    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
    if (isBlock) {
      result += '\n';
    }
  };

  for (const child of Array.from(root.childNodes)) {
    walk(child);
  }

  const trimmedTail = result.replace(/\n+$/u, match => match.slice(0, 2));
  return trimmedTail;
}

export function textContainsSkillChipMarker(
  plainText: string,
  contexts: DeepChatSkillContext[]
): boolean {
  return contexts.some(context =>
    getSkillTitleMarkers(context, contexts).some(marker => plainText.includes(marker))
  );
}

/** 写入纯文本并水合 Chip（输入框 dismissible / 消息气泡 static） */
export function setContentWithInlineSkillChips(
  host: HTMLElement,
  plainText: string,
  contexts: DeepChatSkillContext[],
  mode: SkillChipMode = 'dismissible'
): void {
  const normalized = normalizeSkillChipDraftText(plainText, contexts);
  if (contexts.length === 0 || !textContainsSkillChipMarker(normalized, contexts)) {
    host.textContent = normalized;
    return;
  }

  host.replaceChildren();
  for (const part of splitTextIntoChipParts(normalized, contexts)) {
    if (part.type === 'text') {
      host.appendChild(document.createTextNode(part.value));
    } else {
      host.appendChild(createSkillContextChip(part.context, mode));
    }
  }
}

function isStaticChipExcludedTextNode(node: Text): boolean {
  return Boolean(node.parentElement?.closest('a, code, pre, script, style, textarea'));
}

function hydrateStaticSkillChipsInBubble(
  bubble: HTMLElement,
  contexts: DeepChatSkillContext[]
): void {
  const textNodes: Array<{ node: Text; excluded: boolean }> = [];
  const collectTextNodes = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        textNodes.push({
          node: child as Text,
          excluded: isStaticChipExcludedTextNode(child as Text),
        });
        continue;
      }
      if (child instanceof HTMLElement && !child.classList.contains(SKILL_CHIP_CLASS)) {
        collectTextNodes(child);
      }
    }
  };
  collectTextNodes(bubble);

  let hasLeadingMessageText = false;
  for (const { node: textNode, excluded } of textNodes) {
    if (excluded) {
      hasLeadingMessageText ||= Boolean(textNode.data.trim());
      continue;
    }

    const normalized = normalizeSkillChipDraftText(textNode.data, contexts, !hasLeadingMessageText);
    if (!textContainsSkillChipMarker(normalized, contexts)) {
      hasLeadingMessageText ||= Boolean(textNode.data.trim());
      continue;
    }

    const parts = splitTextIntoChipParts(normalized, contexts);
    if (!parts.some(part => part.type === 'chip')) {
      continue;
    }

    const fragment = bubble.ownerDocument.createDocumentFragment();
    for (const part of parts) {
      fragment.appendChild(
        part.type === 'text'
          ? bubble.ownerDocument.createTextNode(part.value)
          : createSkillContextChip(part.context, 'static')
      );
    }
    textNode.replaceWith(fragment);
    hasLeadingMessageText ||= parts.some(
      part => part.type === 'text' && Boolean(part.value.trim())
    );
  }
}

/**
 * 将用户消息气泡中的「技能名」水合为 static Chip（无移除 ×）。
 * 已含 Chip 的气泡跳过，避免 MutationObserver 循环。
 */
export function hydrateUserMessageBubblesWithSkillChips(
  root: ShadowRoot | Document | HTMLElement,
  contexts: DeepChatSkillContext[]
): void {
  if (contexts.length === 0) {
    return;
  }

  const bubbles = root.querySelectorAll<HTMLElement>(
    '.deep-chat-outer-container-role-user .message-bubble, .outer-message-container.deep-chat-outer-container-role-user .message-bubble'
  );

  for (const bubble of Array.from(bubbles)) {
    if (bubble.querySelector(`.${SKILL_CHIP_CLASS}`)) {
      continue;
    }
    hydrateStaticSkillChipsInBubble(bubble, contexts);
  }
}
