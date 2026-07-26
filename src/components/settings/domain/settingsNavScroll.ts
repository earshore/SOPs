// Pure helpers: which settings side-nav target is active while scrolling.

export interface SettingsNavScrollItem {
  id: string;
  groupId: string;
  /** Offset from top of scroll container content (scrollTop space). */
  offsetTop: number;
}

/**
 * Last item whose offsetTop is at or above the sticky scan line wins.
 */
export function pickActiveSettingsNavId(
  items: readonly SettingsNavScrollItem[],
  scrollTop: number,
  stickyOffset = 48
): string | null {
  if (!items.length) return null;
  const sorted = [...items].sort((a, b) => a.offsetTop - b.offsetTop);
  const line = scrollTop + stickyOffset;
  let active = sorted[0].id;
  for (const item of sorted) {
    if (item.offsetTop <= line) {
      active = item.id;
    } else {
      break;
    }
  }
  return active;
}

export function pickActiveSettingsNavGroup(
  items: readonly SettingsNavScrollItem[],
  activeId: string | null
): string | null {
  if (!activeId) return null;
  return items.find((item) => item.id === activeId)?.groupId ?? null;
}

export function buildSettingsNavScrollItems(
  nodes: ReadonlyArray<{ id: string; groupId: string; offsetTop: number }>
): SettingsNavScrollItem[] {
  return nodes
    .filter((n) => n.id && Number.isFinite(n.offsetTop))
    .map((n) => ({ id: n.id, groupId: n.groupId, offsetTop: n.offsetTop }));
}

/** Measure markers with data-settings-nav-id inside a scroller. */
export function measureSettingsNavMarkers(
  scroller: HTMLElement,
  markers: Iterable<Element>
): SettingsNavScrollItem[] {
  const scrollerRect = scroller.getBoundingClientRect();
  const items: SettingsNavScrollItem[] = [];
  for (const el of markers) {
    if (!(el instanceof HTMLElement)) continue;
    const id = el.getAttribute('data-settings-nav-id')?.trim();
    if (!id) continue;
    const groupId = el.getAttribute('data-settings-nav-group')?.trim() || '';
    const rect = el.getBoundingClientRect();
    const offsetTop = scroller.scrollTop + (rect.top - scrollerRect.top);
    items.push({ id, groupId, offsetTop });
  }
  return items;
}
