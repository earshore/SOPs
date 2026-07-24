/**
 * Leaf DOM helpers — no deep-chat domain imports (cycle-safe).
 */
import type { DeepChatElement } from '../types';

export function getChat(container: HTMLElement): DeepChatElement | null {
  return container.querySelector<DeepChatElement>('#deep-chat-view');
}

/** Create chevron icon element (matches historical Deep Chat chrome). */
export function createChevronIcon(doc: Document): HTMLElement {
  const wrap = doc.createElement('span');
  wrap.className = 'deep-chat-dt-chevron';
  wrap.setAttribute('aria-hidden', 'true');

  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('focusable', 'false');

  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 3.2 L11 8 L6 12.8');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  wrap.appendChild(svg);
  return wrap;
}

export function setToggleExpanded(toggle: HTMLElement, expanded: boolean): void {
  toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  toggle.classList.toggle('is-expanded', expanded);
}

export function formatCompletedDurationLabel(durationSec: number): string {
  return `已完成 ${Math.max(0, Math.round(durationSec))}s`;
}
